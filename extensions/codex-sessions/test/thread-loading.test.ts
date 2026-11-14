import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeSQL } from "@raycast/utils";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({})),
}));
vi.mock("@raycast/utils", () => ({
  executeSQL: vi.fn(),
}));

import { escapeSqlLiteral, loadProjects, loadThreads, threadTitle } from "../src/lib/threads";

const legacySchema = readFileSync(new URL("./fixtures/state-schema.sql", import.meta.url), "utf8");
let codexHome: string;

beforeEach(() => {
  codexHome = mkdtempSync(join(tmpdir(), "codex-thread-loading-"));
  vi.stubEnv("CODEX_HOME", codexHome);
  vi.mocked(executeSQL).mockImplementation(async (path, query) => {
    const output = execFileSync("sqlite3", ["-readonly", "-json", path, query], { encoding: "utf8" });
    return JSON.parse(output || "[]");
  });
});

describe("browsing project sessions", () => {
  it.each(["Interactive", "All", "Archived"] as const)(
    "scopes %s lists and searches to the exact project before applying the limit",
    async (mode) => {
      const path = createDatabase();
      const projectPath = "/tmp/O'Brien_%/日本語 project";
      const escapedPath = escapeSqlLiteral(projectPath);
      const archived = mode === "Archived" ? 1 : 0;
      execFileSync("sqlite3", [path], {
        input: `UPDATE threads SET cwd = '${escapedPath}', archived = ${archived};
          WITH RECURSIVE sequence(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM sequence WHERE n < 205)
          INSERT INTO threads (id, rollout_path, updated_at, source, thread_source, cwd, name, title, archived)
          SELECT 'other-' || n, '/tmp/other.jsonl', 1800000000 + n, 'vscode', 'user',
            '${escapedPath}-other', 'O''Brien の表示名', '元の依頼文', ${archived} FROM sequence;`,
      });

      const result = await loadThreads(mode, "", projectPath);
      const search = await loadThreads(mode, "O'Brien の表示名", projectPath);

      for (const loaded of [result, search]) {
        expect(loaded.degraded).toBe(false);
        expect(loaded.rows.map((row) => row.id)).toEqual(["thread-1"]);
        expect(loaded.rows[0].cwd).toBe(projectPath);
      }
    },
  );

  it("counts the same sessions that each project's selected scope displays", async () => {
    const path = createDatabase();
    execFileSync("sqlite3", [path], {
      input: `INSERT INTO threads (id, rollout_path, updated_at, source, thread_source, cwd, title, archived) VALUES
        ('archived', '/tmp/a.jsonl', 1700000002, 'vscode', 'user', '/tmp/project', 'Archived', 1),
        ('exec', '/tmp/b.jsonl', 1700000003, 'exec', 'user', '/tmp/project', 'Exec', 0),
        ('subagent', '/tmp/c.jsonl', 1700000004, 'vscode', 'subagent', '/tmp/project', 'Subagent', 0),
        ('automation', '/tmp/d.jsonl', 1700000005, '{"type":"automation"}', 'user', '/tmp/project', 'Automation', 0),
        ('other', '/tmp/e.jsonl', 1700000006, 'vscode', 'user', '/other/project', 'Another project', 0);`,
    });

    for (const [mode, count] of [
      ["Interactive", 1],
      ["All", 5],
      ["Archived", 1],
    ] as const) {
      const projects = await loadProjects(mode);
      const threads = await loadThreads(mode, "", "/tmp/project");
      expect(projects.degraded).toBe(false);
      expect(projects.rows.find((row) => row.cwd === "/tmp/project")?.session_count).toBe(count);
      expect(threads.rows).toHaveLength(count);
    }
    const archived = await loadProjects("Archived");
    expect(archived.rows.map((row) => row.cwd)).toEqual(["/tmp/project"]);
    const legacyProjects = await loadProjects();
    expect(legacyProjects.rows.find((row) => row.cwd === "/tmp/project")?.session_count).toBe(2);
  });

  it("supports scoped loading from older databases without name", async () => {
    createDatabase(false);
    const result = await loadThreads("All", "元の依頼文", "/tmp/project");
    expect(result.degraded).toBe(false);
    expect(result.rows.map(threadTitle)).toEqual(["元の依頼文"]);
    expect((await loadThreads("All", "", "/other/project")).rows).toEqual([]);
  });

  it("keeps rollout fallback results inside the selected project", async () => {
    const directory = join(codexHome, "sessions", "2026", "07", "14");
    mkdirSync(directory, { recursive: true });
    copyFileSync(new URL("./fixtures/rollout-user-japanese.jsonl", import.meta.url), join(directory, "rollout.jsonl"));

    const matching = await loadThreads("Interactive", "", "/tmp/日本語 project");
    expect(matching.degraded).toBe(true);
    expect(matching.rows.map((row) => row.id)).toEqual(["thread-japanese-1"]);
    const other = await loadThreads("Interactive", "", "/tmp/another-project");
    expect(other.degraded).toBe(true);
    expect(other.rows).toEqual([]);
    expect((await loadThreads("Archived", "", "/tmp/日本語 project")).rows).toEqual([]);
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(codexHome, { recursive: true, force: true });
});

function createDatabase(hasThreadName = true, version = 5): string {
  const path = join(codexHome, `state_${version}.sqlite`);
  execFileSync("sqlite3", [path], {
    input: `${legacySchema}
      INSERT INTO threads (
        id, rollout_path, created_at, updated_at, source, thread_source, cwd,
        title, first_user_message, preview, archived
      ) VALUES (
        'thread-1', '/tmp/rollout.jsonl', 1700000000, 1700000001, 'vscode', 'user', '/tmp/project',
        '元の依頼文', '元の依頼文', '元の依頼文', 0
      );
      ${hasThreadName ? "ALTER TABLE threads ADD COLUMN name TEXT; UPDATE threads SET name = '  O''Brien の表示名  ';" : ""}`,
  });
  return path;
}

describe("loading thread display names from SQLite", () => {
  it("displays name instead of the original prompt stored in title", async () => {
    createDatabase();

    const result = await loadThreads();

    expect(result.degraded).toBe(false);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ title: "元の依頼文", displayTitle: "O'Brien の表示名" });
    expect(threadTitle(result.rows[0])).toBe("O'Brien の表示名");
  });

  it.each(["All", "Archived"] as const)("finds renamed threads by display name in %s mode", async (mode) => {
    const path = createDatabase();
    if (mode === "Archived") execFileSync("sqlite3", [path, "UPDATE threads SET archived = 1"]);

    const result = await loadThreads(mode, "O'Brien の表示名");

    expect(result.degraded).toBe(false);
    expect(result.rows.map((row) => row.id)).toEqual(["thread-1"]);
    expect(threadTitle(result.rows[0])).toBe("O'Brien の表示名");
  });

  it.each(["NULL", "''", "'   '"])("uses the legacy title when name is %s", async (name) => {
    const path = createDatabase();
    execFileSync("sqlite3", [path, `UPDATE threads SET name = ${name}`]);

    const result = await loadThreads();

    expect(result.degraded).toBe(false);
    expect(result.rows.map(threadTitle)).toEqual(["元の依頼文"]);
  });

  it("loads and searches older databases without name, including project history", async () => {
    createDatabase(false);

    const result = await loadThreads();
    const search = await loadThreads("All", "元の依頼文");
    const projects = await loadProjects();

    expect(result.degraded).toBe(false);
    expect(result.rows.map(threadTitle)).toEqual(["元の依頼文"]);
    expect(search.degraded).toBe(false);
    expect(search.rows.map((row) => row.id)).toEqual(["thread-1"]);
    expect(projects.degraded).toBe(false);
    expect(projects.rows).toEqual([
      { cwd: "/tmp/project", session_count: 1, last_used: 1700000001000, git_origin_url: null },
    ]);
  });

  it("discovers the newest compatible database and detects its name column", async () => {
    createDatabase(false, 4);
    createDatabase(true, 5);
    execFileSync("sqlite3", [join(codexHome, "state_6.sqlite"), "CREATE TABLE threads (id TEXT)"]);

    const result = await loadThreads();

    expect(result.degraded).toBe(false);
    expect(result.rows.map(threadTitle)).toEqual(["O'Brien の表示名"]);
  });
});
