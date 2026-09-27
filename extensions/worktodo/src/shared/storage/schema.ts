import type { DatabaseSync } from "node:sqlite";
import { normalizeLabelName } from "../domain/validation";

export const WORKTODO_SCHEMA_VERSION = 3;

const PROJECTS_SQL = `
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  position INTEGER NOT NULL CHECK (position >= 0),
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= created_at_ms)
) STRICT;
`;

const LABELS_SQL = `
CREATE TABLE labels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  name_key TEXT NOT NULL UNIQUE CHECK (length(name_key) > 0),
  position INTEGER NOT NULL CHECK (position >= 0),
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= created_at_ms)
) STRICT;
`;

const TASK_COLUMNS_SQL = `
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  notes TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 0 CHECK (priority IN (0, 1)),
  position INTEGER NOT NULL CHECK (position >= 0),
  project_id TEXT,
  due_kind TEXT NOT NULL DEFAULT 'none'
    CHECK (due_kind IN ('none', 'all_day', 'timed')),
  due_date TEXT,
  due_at_ms INTEGER,
  due_timezone TEXT,
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= created_at_ms),
  completed_at_ms INTEGER CHECK (
    completed_at_ms IS NULL OR
    (completed_at_ms >= created_at_ms AND completed_at_ms <= updated_at_ms)
  ),
  trashed_at_ms INTEGER CHECK (
    trashed_at_ms IS NULL OR
    (trashed_at_ms >= created_at_ms AND trashed_at_ms <= updated_at_ms)
  ),
  CHECK (
    (due_kind = 'none' AND due_date IS NULL AND due_at_ms IS NULL AND due_timezone IS NULL) OR
    (
      due_kind = 'all_day' AND
      due_date IS NOT NULL AND
      due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND
      length(due_date) = 10 AND
      due_at_ms IS NULL AND
      due_timezone IS NULL
    ) OR
    (
      due_kind = 'timed' AND
      due_date IS NULL AND
      due_at_ms IS NOT NULL AND
      due_at_ms >= 0 AND
      due_timezone IS NOT NULL AND
      length(trim(due_timezone)) > 0
    )
  ),
  FOREIGN KEY (project_id) REFERENCES projects (id) ON UPDATE RESTRICT ON DELETE RESTRICT
`;

const VERSION_2_TASK_COLUMNS_SQL = `
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  notes TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'none'
    CHECK (priority IN ('none', 'low', 'medium', 'high')),
  position INTEGER NOT NULL CHECK (position >= 0),
  project_id TEXT,
  due_kind TEXT NOT NULL DEFAULT 'none'
    CHECK (due_kind IN ('none', 'all_day', 'timed')),
  due_date TEXT,
  due_at_ms INTEGER,
  due_timezone TEXT,
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= created_at_ms),
  completed_at_ms INTEGER CHECK (
    completed_at_ms IS NULL OR
    (completed_at_ms >= created_at_ms AND completed_at_ms <= updated_at_ms)
  ),
  trashed_at_ms INTEGER CHECK (
    trashed_at_ms IS NULL OR
    (trashed_at_ms >= created_at_ms AND trashed_at_ms <= updated_at_ms)
  ),
  CHECK (
    (due_kind = 'none' AND due_date IS NULL AND due_at_ms IS NULL AND due_timezone IS NULL) OR
    (
      due_kind = 'all_day' AND
      due_date IS NOT NULL AND
      due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND
      length(due_date) = 10 AND
      due_at_ms IS NULL AND
      due_timezone IS NULL
    ) OR
    (
      due_kind = 'timed' AND
      due_date IS NULL AND
      due_at_ms IS NOT NULL AND
      due_at_ms >= 0 AND
      due_timezone IS NOT NULL AND
      length(trim(due_timezone)) > 0
    )
  ),
  FOREIGN KEY (project_id) REFERENCES projects (id) ON UPDATE RESTRICT ON DELETE RESTRICT
`;

const TASK_LABELS_SQL = `
CREATE TABLE task_labels (
  task_id TEXT NOT NULL,
  label_id TEXT NOT NULL,
  PRIMARY KEY (task_id, label_id),
  FOREIGN KEY (task_id) REFERENCES tasks (id) ON UPDATE RESTRICT ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels (id) ON UPDATE RESTRICT ON DELETE CASCADE
) STRICT;
`;

const INDEXES_SQL = `
CREATE INDEX projects_order_idx
  ON projects (position, created_at_ms, id);
CREATE INDEX labels_order_idx
  ON labels (position, created_at_ms, id);
CREATE INDEX tasks_project_fk_idx
  ON tasks (project_id);
CREATE INDEX task_labels_label_idx
  ON task_labels (label_id, task_id);
CREATE INDEX tasks_inbox_order_idx
  ON tasks (position, created_at_ms, id)
  WHERE project_id IS NULL AND trashed_at_ms IS NULL;
CREATE INDEX tasks_all_day_today_idx
  ON tasks (due_date, position, created_at_ms, id)
  WHERE due_kind = 'all_day' AND completed_at_ms IS NULL AND trashed_at_ms IS NULL;
CREATE INDEX tasks_timed_today_idx
  ON tasks (due_at_ms, position, created_at_ms, id)
  WHERE due_kind = 'timed' AND completed_at_ms IS NULL AND trashed_at_ms IS NULL;
CREATE INDEX tasks_completed_idx
  ON tasks (completed_at_ms DESC, id)
  WHERE completed_at_ms IS NOT NULL AND trashed_at_ms IS NULL;
CREATE INDEX tasks_trashed_idx
  ON tasks (trashed_at_ms DESC, id)
  WHERE trashed_at_ms IS NOT NULL;
`;

const VERSION_1_INDEXES_SQL = `
CREATE INDEX projects_order_idx
  ON projects (position, created_at_ms, id);
CREATE INDEX sections_project_order_idx
  ON sections (project_id, position, created_at_ms, id);
CREATE INDEX tasks_project_fk_idx
  ON tasks (project_id);
CREATE INDEX tasks_section_project_fk_idx
  ON tasks (section_id, project_id);
CREATE INDEX tasks_inbox_order_idx
  ON tasks (position, created_at_ms, id)
  WHERE project_id IS NULL AND section_id IS NULL AND trashed_at_ms IS NULL;
CREATE INDEX tasks_all_day_today_idx
  ON tasks (due_date, position, created_at_ms, id)
  WHERE due_kind = 'all_day' AND completed_at_ms IS NULL AND trashed_at_ms IS NULL;
CREATE INDEX tasks_timed_today_idx
  ON tasks (due_at_ms, position, created_at_ms, id)
  WHERE due_kind = 'timed' AND completed_at_ms IS NULL AND trashed_at_ms IS NULL;
CREATE INDEX tasks_completed_idx
  ON tasks (completed_at_ms DESC, id)
  WHERE completed_at_ms IS NOT NULL AND trashed_at_ms IS NULL;
CREATE INDEX tasks_trashed_idx
  ON tasks (trashed_at_ms DESC, id)
  WHERE trashed_at_ms IS NOT NULL;
`;

const VERSION_2_BODY = `${PROJECTS_SQL}${LABELS_SQL}
CREATE TABLE tasks (${VERSION_2_TASK_COLUMNS_SQL}) STRICT;
${TASK_LABELS_SQL}${INDEXES_SQL}`;

const VERSION_3_BODY = `${PROJECTS_SQL}${LABELS_SQL}
CREATE TABLE tasks (${TASK_COLUMNS_SQL}) STRICT;
${TASK_LABELS_SQL}${INDEXES_SQL}`;

export const PRODUCTION_SCHEMA_SQL = `BEGIN IMMEDIATE;${VERSION_3_BODY}
PRAGMA user_version = 3;
COMMIT;
`;

export const WORKTODO_SCHEMA_VERSION_2_SQL = `BEGIN IMMEDIATE;${VERSION_2_BODY}
PRAGMA user_version = 2;
COMMIT;
`;

export const WORKTODO_SCHEMA_VERSION_1_SQL = `BEGIN IMMEDIATE;
${PROJECTS_SQL}
CREATE TABLE sections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  position INTEGER NOT NULL CHECK (position >= 0),
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= created_at_ms),
  FOREIGN KEY (project_id) REFERENCES projects (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  UNIQUE (id, project_id)
) STRICT;

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  notes TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high')),
  position INTEGER NOT NULL CHECK (position >= 0),
  project_id TEXT,
  section_id TEXT,
  due_kind TEXT NOT NULL DEFAULT 'none' CHECK (due_kind IN ('none', 'all_day', 'timed')),
  due_date TEXT,
  due_at_ms INTEGER,
  due_timezone TEXT,
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= created_at_ms),
  completed_at_ms INTEGER CHECK (
    completed_at_ms IS NULL OR (completed_at_ms >= created_at_ms AND completed_at_ms <= updated_at_ms)
  ),
  trashed_at_ms INTEGER CHECK (
    trashed_at_ms IS NULL OR (trashed_at_ms >= created_at_ms AND trashed_at_ms <= updated_at_ms)
  ),
  CHECK (section_id IS NULL OR project_id IS NOT NULL),
  CHECK (
    (due_kind = 'none' AND due_date IS NULL AND due_at_ms IS NULL AND due_timezone IS NULL) OR
    (due_kind = 'all_day' AND due_date IS NOT NULL AND due_at_ms IS NULL AND due_timezone IS NULL) OR
    (due_kind = 'timed' AND due_date IS NULL AND due_at_ms IS NOT NULL AND due_at_ms >= 0 AND due_timezone IS NOT NULL)
  ),
  FOREIGN KEY (project_id) REFERENCES projects (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (section_id, project_id)
    REFERENCES sections (id, project_id) ON UPDATE RESTRICT ON DELETE RESTRICT
) STRICT;

${VERSION_1_INDEXES_SQL}

PRAGMA user_version = 1;
COMMIT;
`;

export class UnsupportedSchemaVersionError extends Error {
  readonly version: number;

  constructor(version: number) {
    super(`Unsupported Worktodo schema version: ${version}`);
    this.name = "UnsupportedSchemaVersionError";
    this.version = version;
  }
}

export type MigrationResult = {
  applied: boolean;
  previousVersion: number;
  currentVersion: number;
};

type MigrationOptions = {
  beforeVersionSet?: () => void;
};

type LegacySectionRow = {
  id: string;
  project_id: string;
  name: string;
  position: number;
  created_at_ms: number;
  updated_at_ms: number;
};

type IdRow = { id: string };

function userVersion(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get();
  return Number(row ? Object.values(row)[0] : Number.NaN);
}

function migrateVersion1(db: DatabaseSync): void {
  db.exec(`${LABELS_SQL}
CREATE TABLE tasks_v2 (${VERSION_2_TASK_COLUMNS_SQL}) STRICT;`);

  const sections = db
    .prepare(
      `SELECT sections.*
       FROM sections
       JOIN projects ON projects.id = sections.project_id
       ORDER BY projects.position, projects.created_at_ms, projects.id,
                sections.position, sections.created_at_ms, sections.id`,
    )
    .all() as LegacySectionRow[];
  const labelByName = new Map<string, string>();
  const labelBySection = new Map<string, string>();
  const insertLabel = db.prepare(
    "INSERT INTO labels(id, name, name_key, position, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?, ?, ?)",
  );
  for (const section of sections) {
    const nameKey = normalizeLabelName(section.name);
    let labelId = labelByName.get(nameKey);
    if (!labelId) {
      labelId = section.id;
      labelByName.set(nameKey, labelId);
      insertLabel.run(
        labelId,
        section.name,
        nameKey,
        labelByName.size * 1_024,
        section.created_at_ms,
        section.updated_at_ms,
      );
    }
    labelBySection.set(section.id, labelId);
  }

  db.exec(`
    INSERT INTO tasks_v2
    SELECT id, title, notes, priority, position, project_id,
           due_kind, due_date, due_at_ms, due_timezone,
           created_at_ms, updated_at_ms, completed_at_ms, trashed_at_ms
    FROM tasks
    WHERE project_id IS NULL
  `);

  const projects = db.prepare("SELECT id FROM projects ORDER BY position, created_at_ms, id").all() as IdRow[];
  const insertTask = db.prepare(`
    INSERT INTO tasks_v2
    SELECT id, title, notes, priority, ?, project_id,
           due_kind, due_date, due_at_ms, due_timezone,
           created_at_ms, updated_at_ms, completed_at_ms, trashed_at_ms
    FROM tasks WHERE id = ?
  `);
  const associations: Array<[string, string]> = [];

  for (const project of projects) {
    const directTasks = db
      .prepare("SELECT id FROM tasks WHERE project_id = ? AND section_id IS NULL ORDER BY position, created_at_ms, id")
      .all(project.id) as IdRow[];
    const projectSections = sections.filter((section) => section.project_id === project.id);
    const sectionTasks = projectSections.flatMap((section) => {
      const tasks = db
        .prepare("SELECT id FROM tasks WHERE section_id = ? ORDER BY position, created_at_ms, id")
        .all(section.id) as IdRow[];
      const labelId = labelBySection.get(section.id);
      if (!labelId) {
        throw new Error("A migrated section has no label");
      }
      tasks.forEach((task) => associations.push([task.id, labelId]));
      return tasks;
    });
    [...directTasks, ...sectionTasks].forEach((task, index) => insertTask.run((index + 1) * 1_024, task.id));
  }

  db.exec(`
    DROP TABLE tasks;
    DROP TABLE sections;
    ALTER TABLE tasks_v2 RENAME TO tasks;
    ${TASK_LABELS_SQL}
  `);
  const insertAssociation = db.prepare("INSERT INTO task_labels(task_id, label_id) VALUES (?, ?)");
  associations.forEach(([taskId, labelId]) => insertAssociation.run(taskId, labelId));
  db.exec("DROP INDEX IF EXISTS projects_order_idx");
  db.exec(INDEXES_SQL);
}

function migrateVersion2(db: DatabaseSync): void {
  db.exec(`
    CREATE TEMP TABLE task_labels_v2 AS
      SELECT task_id, label_id FROM task_labels;
    DROP TABLE task_labels;
    CREATE TABLE tasks_v3 (${TASK_COLUMNS_SQL}) STRICT;
    INSERT INTO tasks_v3
    SELECT id, title, notes, CASE priority WHEN 'high' THEN 1 ELSE 0 END,
           position, project_id, due_kind, due_date, due_at_ms, due_timezone,
           created_at_ms, updated_at_ms, completed_at_ms, trashed_at_ms
    FROM tasks;
    DROP TABLE tasks;
    ALTER TABLE tasks_v3 RENAME TO tasks;
    ${TASK_LABELS_SQL}
    INSERT INTO task_labels(task_id, label_id)
      SELECT task_id, label_id FROM task_labels_v2;
    DROP TABLE task_labels_v2;
    DROP INDEX IF EXISTS projects_order_idx;
    DROP INDEX IF EXISTS labels_order_idx;
    ${INDEXES_SQL}
  `);
}

export function applyMigrations(db: DatabaseSync, options: MigrationOptions = {}): MigrationResult {
  db.exec("BEGIN IMMEDIATE");

  try {
    const previousVersion = userVersion(db);
    if (previousVersion > WORKTODO_SCHEMA_VERSION || previousVersion < 0) {
      throw new UnsupportedSchemaVersionError(previousVersion);
    }
    if (previousVersion === WORKTODO_SCHEMA_VERSION) {
      db.exec("COMMIT");
      return { applied: false, previousVersion, currentVersion: previousVersion };
    }

    if (previousVersion === 0) {
      db.exec(VERSION_3_BODY);
    } else if (previousVersion === 1) {
      migrateVersion1(db);
      migrateVersion2(db);
    } else if (previousVersion === 2) {
      migrateVersion2(db);
    } else {
      throw new UnsupportedSchemaVersionError(previousVersion);
    }

    options.beforeVersionSet?.();
    db.exec(`PRAGMA user_version = ${WORKTODO_SCHEMA_VERSION}`);
    db.exec("COMMIT");
    return { applied: true, previousVersion, currentVersion: WORKTODO_SCHEMA_VERSION };
  } catch (error) {
    if (db.isTransaction) {
      db.exec("ROLLBACK");
    }
    throw error;
  }
}
