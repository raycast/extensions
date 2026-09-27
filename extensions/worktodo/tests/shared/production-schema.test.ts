import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { openWorktodoDatabase } from "../../src/shared/storage/database";
import {
  applyMigrations,
  PRODUCTION_SCHEMA_SQL,
  UnsupportedSchemaVersionError,
  WORKTODO_SCHEMA_VERSION_1_SQL,
  WORKTODO_SCHEMA_VERSION_2_SQL,
} from "../../src/shared/storage/schema";
import { extractTaskModelSchema } from "../helpers/extract-task-model-schema";

const executeFile = promisify(execFile);
const temporaryDirectories: string[] = [];
const id = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;

async function temporaryDatabasePath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "worktodo-production-schema-test-"));
  temporaryDirectories.push(directory);
  return join(directory, "worktodo.sqlite");
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("production schema", () => {
  it("matches the approved marked schema exactly", async () => {
    const markdown = await readFile(join(process.cwd(), "docs", "research", "task-model.md"), "utf8");
    expect(PRODUCTION_SCHEMA_SQL).toBe(extractTaskModelSchema(markdown));
  });

  it("creates a fresh version 3 database exactly once", async () => {
    const db = openWorktodoDatabase(await temporaryDatabasePath());
    try {
      expect(applyMigrations(db)).toEqual({ applied: true, previousVersion: 0, currentVersion: 3 });
      expect(applyMigrations(db)).toEqual({ applied: false, previousVersion: 3, currentVersion: 3 });
      expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(3);
      expect(
        db
          .prepare("PRAGMA table_list")
          .all()
          .filter((row) => ["projects", "labels", "tasks", "task_labels"].includes(String(row.name)))
          .map((row) => [row.name, row.strict])
          .sort(),
      ).toEqual([
        ["labels", 1],
        ["projects", 1],
        ["task_labels", 1],
        ["tasks", 1],
      ]);
      expect(
        db
          .prepare(
            "SELECT name FROM sqlite_schema WHERE type = 'index' AND name NOT LIKE 'sqlite_autoindex_%' ORDER BY name",
          )
          .all()
          .map((row) => row.name),
      ).toEqual([
        "labels_order_idx",
        "projects_order_idx",
        "task_labels_label_idx",
        "tasks_all_day_today_idx",
        "tasks_completed_idx",
        "tasks_inbox_order_idx",
        "tasks_project_fk_idx",
        "tasks_timed_today_idx",
        "tasks_trashed_idx",
      ]);
      expect(db.prepare("PRAGMA integrity_check").get()?.integrity_check).toBe("ok");
      expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(
        db
          .prepare("PRAGMA table_info(tasks)")
          .all()
          .find((row) => row.name === "priority"),
      ).toMatchObject({
        type: "INTEGER",
        notnull: 1,
        dflt_value: "0",
      });
    } finally {
      db.close();
    }
  });

  it("atomically converts populated version 1 sections into deterministic global labels", async () => {
    const db = openWorktodoDatabase(await temporaryDatabasePath());
    try {
      db.exec(WORKTODO_SCHEMA_VERSION_1_SQL);
      expect(
        db
          .prepare("SELECT name FROM sqlite_schema WHERE type = 'index' AND name NOT LIKE 'sqlite_autoindex_%'")
          .all()
          .map((row) => row.name),
      ).toContain("projects_order_idx");
      const insertProject = db.prepare("INSERT INTO projects VALUES (?, ?, ?, ?, ?)");
      insertProject.run(id(1), "Work", 10, 100, 150);
      insertProject.run(id(2), "Home", 20, 110, 160);
      const insertSection = db.prepare("INSERT INTO sections VALUES (?, ?, ?, ?, ?, ?)");
      insertSection.run(id(11), id(1), "Waiting", 20, 200, 250);
      insertSection.run(id(12), id(1), "Empty", 30, 210, 260);
      insertSection.run(id(13), id(2), "ｗＡＩＴＩＮＧ", 10, 220, 270);
      const insertTask = db.prepare("INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      insertTask.run(id(21), "Direct", "", "high", 9_000, id(1), null, "none", null, null, null, 300, 350, null, null);
      insertTask.run(
        id(22),
        "Section completed",
        "kept",
        "medium",
        8,
        id(1),
        id(11),
        "all_day",
        "2026-09-04",
        null,
        null,
        301,
        401,
        400,
        null,
      );
      insertTask.run(
        id(23),
        "Merged trashed",
        "",
        "low",
        7,
        id(2),
        id(13),
        "timed",
        null,
        1_800_000_000_000,
        "Australia/Melbourne",
        302,
        402,
        null,
        402,
      );
      insertTask.run(id(24), "No project", "", "none", 77, null, null, "none", null, null, null, 303, 303, null, null);

      expect(applyMigrations(db)).toEqual({ applied: true, previousVersion: 1, currentVersion: 3 });
      expect(
        db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'sections'").get(),
      ).toBeUndefined();
      expect(
        db
          .prepare("PRAGMA table_info(tasks)")
          .all()
          .some((row) => row.name === "section_id"),
      ).toBe(false);
      expect(db.prepare("SELECT id, name, position FROM labels ORDER BY position").all()).toEqual([
        { id: id(11), name: "Waiting", position: 1_024 },
        { id: id(12), name: "Empty", position: 2_048 },
      ]);
      expect(db.prepare("SELECT id, project_id, position FROM tasks ORDER BY id").all()).toEqual([
        { id: id(21), project_id: id(1), position: 1_024 },
        { id: id(22), project_id: id(1), position: 2_048 },
        { id: id(23), project_id: id(2), position: 1_024 },
        { id: id(24), project_id: null, position: 77 },
      ]);
      expect(db.prepare("SELECT task_id, label_id FROM task_labels ORDER BY task_id").all()).toEqual([
        { task_id: id(22), label_id: id(11) },
        { task_id: id(23), label_id: id(11) },
      ]);
      expect(db.prepare("SELECT id, priority FROM tasks ORDER BY id").all()).toEqual([
        { id: id(21), priority: 1 },
        { id: id(22), priority: 0 },
        { id: id(23), priority: 0 },
        { id: id(24), priority: 0 },
      ]);
      expect(db.prepare("SELECT * FROM tasks WHERE id = ?").get(id(22))).toMatchObject({
        title: "Section completed",
        notes: "kept",
        due_kind: "all_day",
        due_date: "2026-09-04",
        created_at_ms: 301,
        updated_at_ms: 401,
        completed_at_ms: 400,
      });
      expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(
        db
          .prepare(
            "SELECT name FROM sqlite_schema WHERE type = 'index' AND name NOT LIKE 'sqlite_autoindex_%' ORDER BY name",
          )
          .all()
          .map((row) => row.name),
      ).toEqual([
        "labels_order_idx",
        "projects_order_idx",
        "task_labels_label_idx",
        "tasks_all_day_today_idx",
        "tasks_completed_idx",
        "tasks_inbox_order_idx",
        "tasks_project_fk_idx",
        "tasks_timed_today_idx",
        "tasks_trashed_idx",
      ]);
      expect(applyMigrations(db)).toEqual({ applied: false, previousVersion: 3, currentVersion: 3 });
    } finally {
      db.close();
    }
  });

  it("atomically converts version 2 priorities and preserves task label associations", async () => {
    const db = openWorktodoDatabase(await temporaryDatabasePath());
    try {
      db.exec(WORKTODO_SCHEMA_VERSION_2_SQL);
      db.prepare("INSERT INTO projects VALUES (?, ?, ?, ?, ?)").run(id(1), "Work", 1_024, 100, 100);
      db.prepare("INSERT INTO labels VALUES (?, ?, ?, ?, ?, ?)").run(id(2), "Waiting", "waiting", 1_024, 100, 100);
      const insertTask = db.prepare(
        "INSERT INTO tasks VALUES (?, ?, '', ?, ?, ?, 'none', NULL, NULL, NULL, 100, 100, NULL, NULL)",
      );
      insertTask.run(id(10), "None", "none", 1_024, null);
      insertTask.run(id(11), "Low", "low", 2_048, id(1));
      insertTask.run(id(12), "Medium", "medium", 3_072, id(1));
      insertTask.run(id(13), "High", "high", 4_096, id(1));
      db.prepare("INSERT INTO task_labels VALUES (?, ?)").run(id(13), id(2));

      expect(applyMigrations(db)).toEqual({ applied: true, previousVersion: 2, currentVersion: 3 });
      expect(db.prepare("SELECT id, priority, project_id FROM tasks ORDER BY id").all()).toEqual([
        { id: id(10), priority: 0, project_id: null },
        { id: id(11), priority: 0, project_id: id(1) },
        { id: id(12), priority: 0, project_id: id(1) },
        { id: id(13), priority: 1, project_id: id(1) },
      ]);
      expect(db.prepare("SELECT task_id, label_id FROM task_labels").all()).toEqual([
        { task_id: id(13), label_id: id(2) },
      ]);
      expect(db.prepare("PRAGMA integrity_check").get()?.integrity_check).toBe("ok");
      expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      db.close();
    }
  });

  it("rolls back fresh, version 1, and version 2 migrations completely on failure", async () => {
    for (const version of [0, 1, 2]) {
      const db = openWorktodoDatabase(await temporaryDatabasePath());
      try {
        if (version === 1) {
          db.exec(WORKTODO_SCHEMA_VERSION_1_SQL);
        } else if (version === 2) {
          db.exec(WORKTODO_SCHEMA_VERSION_2_SQL);
        }
        expect(() =>
          applyMigrations(db, {
            beforeVersionSet: () => {
              throw new Error("injected migration failure");
            },
          }),
        ).toThrow("injected migration failure");
        expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(version);
        expect(db.isTransaction).toBe(false);
        if (version === 0) {
          expect(
            db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'labels'").get(),
          ).toBeUndefined();
        } else if (version === 1) {
          expect(db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'sections'").get()).toEqual(
            {
              name: "sections",
            },
          );
        } else {
          expect(
            db
              .prepare("PRAGMA table_info(tasks)")
              .all()
              .find((row) => row.name === "priority"),
          ).toMatchObject({
            type: "TEXT",
          });
        }
      } finally {
        db.close();
      }
    }
  });

  it("rejects a future schema version without changing it", async () => {
    const db = openWorktodoDatabase(await temporaryDatabasePath());
    try {
      db.exec("PRAGMA user_version = 4");
      expect(() => applyMigrations(db)).toThrow(UnsupportedSchemaVersionError);
      expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(4);
      expect(db.isTransaction).toBe(false);
    } finally {
      db.close();
    }
  });

  it("serializes concurrent starters without duplicating migration", async () => {
    const databasePath = await temporaryDatabasePath();
    const databaseModule = join(process.cwd(), "dist", "src", "shared", "storage", "database.js");
    const schemaModule = join(process.cwd(), "dist", "src", "shared", "storage", "schema.js");
    const script = `
      const { openWorktodoDatabase } = require(${JSON.stringify(databaseModule)});
      const { applyMigrations } = require(${JSON.stringify(schemaModule)});
      const db = openWorktodoDatabase(process.argv[1]);
      try { process.stdout.write(JSON.stringify(applyMigrations(db))); } finally { db.close(); }
    `;
    const results = await Promise.all([
      executeFile(process.execPath, ["-e", script, databasePath]),
      executeFile(process.execPath, ["-e", script, databasePath]),
    ]);
    const migrations = results.map(({ stdout }) => JSON.parse(stdout) as { applied: boolean; currentVersion: number });
    expect(migrations.filter((result) => result.applied)).toHaveLength(1);
    expect(migrations.every((result) => result.currentVersion === 3)).toBe(true);
  });
});
