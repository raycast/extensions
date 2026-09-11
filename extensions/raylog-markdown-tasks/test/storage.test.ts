import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  createEmptyDocument,
  ensureStorageNote,
  mergeRaylogMarkdown,
  parseRaylogMarkdown,
  RaylogInitializationRequiredError,
  RaylogParseError,
  RaylogRepository,
  RaylogSchemaError,
  resetStorageNote,
} from "../src/lib/storage";
import type { TaskRecord } from "../src/lib/types";

test("flags an empty markdown note for initialization", async () => {
  const notePath = await createTempMarkdownFile("");
  await assert.rejects(() => ensureStorageNote(notePath), RaylogInitializationRequiredError);
});

test("parses a valid v1 markdown note with todo task status", () => {
  const markdown = mergeRaylogMarkdown("# Notes\n", {
    schemaVersion: 1,
    tasks: [
      {
        id: "task-1",
        header: "Header",
        body: "Body",
        workLogs: [],
        status: "todo",
        dueDate: null,
        startDate: null,
        completedAt: null,
        createdAt: "2026-03-31T00:00:00.000Z",
        updatedAt: "2026-03-31T00:00:00.000Z",
      },
    ],
    viewState: {
      hasSelectedListTasksFilter: true,
      listTasksFilter: "done",
      hasSelectedListViewMode: true,
      listViewMode: "list",
    },
  });

  const parsed = parseRaylogMarkdown(markdown);
  assert.equal(parsed.hasManagedBlock, true);
  assert.equal(parsed.document.tasks[0].status, "todo");
  assert.equal(parsed.document.tasks[0].dueDate, null);
  assert.equal(parsed.document.viewState.listTasksFilter, "done");
});

test("throws on invalid JSON inside the Raylog block", () => {
  assert.throws(
    () => {
      parseRaylogMarkdown(
        `<!-- raylog:start -->
\`\`\`json
{
  "schemaVersion": 1,
  nope,
  "tasks": []
}
\`\`\`
<!-- raylog:end -->
`,
      );
    },
    (error: unknown) => {
      assert.ok(error instanceof RaylogParseError);
      assert.match(error.message, /Raylog database is corrupted/i);
      assert.match(error.message, /Malformed JSON near line 3, column 3/i);
      return true;
    },
  );
});

test("describes malformed task data inside the Raylog block", () => {
  assert.throws(
    () => {
      parseRaylogMarkdown(
        mergeRaylogMarkdown("", {
          schemaVersion: 1,
          tasks: [
            {
              id: "task-1",
              header: "",
              body: "",
              workLogs: [],
              status: "todo",
              dueDate: null,
              startDate: null,
              completedAt: null,
              createdAt: "2026-03-31T00:00:00.000Z",
              updatedAt: "2026-03-31T00:00:00.000Z",
            } as unknown as TaskRecord,
          ],
          viewState: {
            hasSelectedListTasksFilter: false,
            listTasksFilter: "all",
            hasSelectedListViewMode: false,
            listViewMode: "summary",
          },
        }),
      );
    },
    (error: unknown) => {
      assert.ok(error instanceof RaylogParseError);
      assert.match(error.message, /Raylog database is corrupted/i);
      assert.match(error.message, /Malformed task data: task header is invalid/i);
      return true;
    },
  );
});

test("describes unsupported schema versions clearly", () => {
  const markdown = mergeRaylogMarkdown("", {
    schemaVersion: 4,
    tasks: [],
    viewState: {
      hasSelectedListTasksFilter: false,
      listTasksFilter: "all",
      hasSelectedListViewMode: false,
      listViewMode: "summary",
    },
  });

  assert.throws(
    () => parseRaylogMarkdown(markdown),
    (error: unknown) => {
      assert.ok(error instanceof RaylogSchemaError);
      assert.match(error.message, /unsupported schema version/i);
      assert.match(error.message, /Expected schema v1, found schema v4/i);
      return true;
    },
  );
});

test("throws on an outdated schema", () => {
  const markdown = mergeRaylogMarkdown("", {
    schemaVersion: 4,
    tasks: [],
    viewState: {
      hasSelectedListTasksFilter: false,
      listTasksFilter: "all",
      hasSelectedListViewMode: false,
      listViewMode: "summary",
    },
  });

  assert.throws(() => parseRaylogMarkdown(markdown), RaylogSchemaError);
});

test("flags a missing block while preserving markdown content", async () => {
  const originalMarkdown = "# Existing Note\n\nKeep this text.";
  const notePath = await createTempMarkdownFile(originalMarkdown);

  await assert.rejects(() => ensureStorageNote(notePath), RaylogInitializationRequiredError);

  const unchangedMarkdown = await fs.promises.readFile(notePath, "utf8");
  assert.match(unchangedMarkdown, /# Existing Note/);
  assert.match(unchangedMarkdown, /Keep this text\./);
  assert.doesNotMatch(unchangedMarkdown, /raylog:start/);
});

test("supports the current task lifecycle without clobbering surrounding markdown", async () => {
  const notePath = await createTempMarkdownFile("# Header\n\nContext above.\n");
  await resetStorageNote(notePath);
  const repository = new RaylogRepository(notePath);

  const created = await repository.createTask({
    header: "Ship Raylog",
    body: "Implement storage",
  });

  const started = await repository.startTask(created.id);
  assert.equal(started.status, "in_progress");

  const updated = await repository.updateTask(created.id, {
    header: "Ship Raylog v2",
    body: "Implement storage and UI",
    workLogs: [],
    status: "in_progress",
    dueDate: "2026-04-03T00:00:00.000Z",
    startDate: "2026-03-30T00:00:00.000Z",
  });

  assert.equal(updated.header, "Ship Raylog v2");
  assert.equal(updated.startDate, "2026-03-30T00:00:00.000Z");

  const completed = await repository.completeTask(created.id);
  assert.equal(completed.status, "done");
  assert.ok(completed.completedAt);

  const reopened = await repository.reopenTask(created.id);
  assert.equal(reopened.status, "todo");
  assert.equal(reopened.completedAt, null);

  const archived = await repository.archiveTask(created.id);
  assert.equal(archived.status, "archived");

  await repository.deleteTask(created.id);
  const finalMarkdown = await fs.promises.readFile(notePath, "utf8");
  assert.match(finalMarkdown, /Context above\./);
  assert.doesNotMatch(finalMarkdown, /Ship Raylog v2/);
});

test("creates, updates, and deletes work logs without clobbering markdown", async () => {
  const notePath = await createTempMarkdownFile("# Header\n\nContext above.\n");
  await resetStorageNote(notePath);
  const repository = new RaylogRepository(notePath);

  const createdTask = await repository.createTask({
    header: "Ship Raylog",
    body: "Implement storage",
  });

  const createdWorkLog = await repository.createWorkLog(createdTask.id, {
    body: "Implemented first pass",
  });
  assert.equal(createdWorkLog.updatedAt, null);

  const taskAfterCreate = await repository.getTask(createdTask.id);
  assert.equal(taskAfterCreate.workLogs.length, 1);
  assert.equal(taskAfterCreate.workLogs[0]?.body, "Implemented first pass");
  assert.ok(taskAfterCreate.updatedAt >= createdTask.updatedAt);

  const updatedWorkLog = await repository.updateWorkLog(createdTask.id, createdWorkLog.id, {
    body: "Implemented and tested first pass",
  });
  assert.ok(updatedWorkLog.updatedAt);

  const taskAfterUpdate = await repository.getTask(createdTask.id);
  assert.equal(taskAfterUpdate.workLogs[0]?.body, "Implemented and tested first pass");

  await repository.deleteWorkLog(createdTask.id, createdWorkLog.id);
  const taskAfterDelete = await repository.getTask(createdTask.id);
  assert.deepEqual(taskAfterDelete.workLogs, []);

  const finalMarkdown = await fs.promises.readFile(notePath, "utf8");
  assert.match(finalMarkdown, /Context above\./);
});

test("resets malformed storage to a fresh v1 document", async () => {
  const notePath = await createTempMarkdownFile(
    "<!-- raylog:start -->\n```json\n{bad-json}\n```\n<!-- raylog:end -->\n",
  );

  await resetStorageNote(notePath);
  const markdown = await fs.promises.readFile(notePath, "utf8");
  const parsed = parseRaylogMarkdown(markdown);

  assert.equal(parsed.document.schemaVersion, 1);
  assert.deepEqual(parsed.document.tasks, []);
});

test("creates a fresh database for an empty markdown note on reset", async () => {
  const notePath = await createTempMarkdownFile("");

  await resetStorageNote(notePath);
  const markdown = await fs.promises.readFile(notePath, "utf8");
  const parsed = parseRaylogMarkdown(markdown);

  assert.equal(parsed.document.schemaVersion, 1);
  assert.deepEqual(parsed.document.tasks, []);
});

test("throws when mutating a missing task", async () => {
  const notePath = await createTempMarkdownFile("");
  await resetStorageNote(notePath);
  const repository = new RaylogRepository(notePath);

  await assert.rejects(() => repository.completeTask("missing"));
  await assert.rejects(() => repository.deleteTask("missing"));
});

test("persists the selected list filter in the storage document", async () => {
  const notePath = await createTempMarkdownFile("");
  await resetStorageNote(notePath);
  const repository = new RaylogRepository(notePath);

  await repository.setListTasksFilter("archived");

  assert.equal(await repository.getListTasksFilter(), "archived");
  const markdown = await fs.promises.readFile(notePath, "utf8");
  assert.match(markdown, /"hasSelectedListTasksFilter": true/);
  assert.match(markdown, /"listTasksFilter": "archived"/);
});

test("persists the selected list view mode in the storage document", async () => {
  const notePath = await createTempMarkdownFile("");
  await resetStorageNote(notePath);
  const repository = new RaylogRepository(notePath);

  await repository.setListViewMode("list");

  assert.equal(await repository.getListViewMode(), "list");
  const markdown = await fs.promises.readFile(notePath, "utf8");
  assert.match(markdown, /"hasSelectedListViewMode": true/);
  assert.match(markdown, /"listViewMode": "list"/);
});

test("serializes concurrent creates so both tasks persist", async () => {
  const notePath = await createTempMarkdownFile("");
  await resetStorageNote(notePath);
  const repository = new RaylogRepository(notePath);

  await Promise.all([
    repository.createTask({ header: "First task" }),
    repository.createTask({ header: "Second task" }),
  ]);

  const tasks = await repository.listTasks();
  assert.equal(tasks.length, 2);
  assert.deepEqual(tasks.map((task) => task.header).sort(), ["First task", "Second task"]);
});

test("serializes concurrent updates in invocation order", async () => {
  const notePath = await createTempMarkdownFile("");
  await resetStorageNote(notePath);
  const repository = new RaylogRepository(notePath);
  const task = await repository.createTask({
    header: "Task",
    body: "Original",
  });

  await Promise.all([
    repository.updateTask(task.id, { header: "Task", body: "First update" }),
    repository.updateTask(task.id, { header: "Task", body: "Second update" }),
  ]);

  const updatedTask = await repository.getTask(task.id);
  assert.equal(updatedTask.body, "Second update");
});

test("failed queued mutations do not block later writes", async () => {
  const notePath = await createTempMarkdownFile("");
  await resetStorageNote(notePath);
  const repository = new RaylogRepository(notePath);

  const results = await Promise.allSettled([
    repository.updateTask("missing", { header: "Missing" }),
    repository.createTask({ header: "Recovery task" }),
  ]);

  assert.equal(results[0]?.status, "rejected");
  assert.equal(results[1]?.status, "fulfilled");

  const tasks = await repository.listTasks();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.header, "Recovery task");
});

test("defaults to open tasks for current view state until a filter is explicitly selected", async () => {
  const notePath = await createTempMarkdownFile(
    `<!-- raylog:start -->
\`\`\`json
{
  "schemaVersion": 1,
  "tasks": [],
  "viewState": {
    "listTasksFilter": "open"
  }
}
\`\`\`
<!-- raylog:end -->
`,
  );
  const repository = new RaylogRepository(notePath);

  assert.equal(await repository.getListTasksFilter(), "open");
});

test("defaults to summary for current view mode until a layout is explicitly selected", async () => {
  const notePath = await createTempMarkdownFile(
    `<!-- raylog:start -->
\`\`\`json
{
  "schemaVersion": 1,
  "tasks": [],
  "viewState": {
    "listViewMode": "list"
  }
}
\`\`\`
<!-- raylog:end -->
`,
  );
  const repository = new RaylogRepository(notePath);

  assert.equal(await repository.getListViewMode(), "summary");
});

test("rejects v1 documents with blocked tasks", () => {
  const markdown = mergeRaylogMarkdown("", {
    schemaVersion: 1,
    tasks: [
      {
        id: "task-1",
        header: "Header",
        body: "",
        workLogs: [],
        status: "blocked",
        dueDate: null,
        startDate: null,
        completedAt: null,
        createdAt: "2026-03-31T00:00:00.000Z",
        updatedAt: "2026-03-31T00:00:00.000Z",
      } as unknown as TaskRecord,
    ],
    viewState: {
      hasSelectedListTasksFilter: false,
      listTasksFilter: "all",
      hasSelectedListViewMode: false,
      listViewMode: "summary",
    },
  });

  assert.throws(() => parseRaylogMarkdown(markdown), RaylogParseError);
});

test("rejects v1 documents with dependency fields", () => {
  const markdown = mergeRaylogMarkdown("", {
    schemaVersion: 1,
    tasks: [
      {
        id: "task-1",
        header: "Header",
        body: "",
        workLogs: [],
        status: "todo",
        blockedByTaskIds: ["task-2"],
        dueDate: null,
        startDate: null,
        completedAt: null,
        createdAt: "2026-03-31T00:00:00.000Z",
        updatedAt: "2026-03-31T00:00:00.000Z",
      } as unknown as TaskRecord,
    ],
    viewState: {
      hasSelectedListTasksFilter: false,
      listTasksFilter: "all",
      hasSelectedListViewMode: false,
      listViewMode: "summary",
    },
  });

  assert.throws(() => parseRaylogMarkdown(markdown), RaylogParseError);
});

test("rejects v1 documents with malformed work logs", () => {
  const markdown = mergeRaylogMarkdown("", {
    schemaVersion: 1,
    tasks: [
      {
        id: "task-1",
        header: "Header",
        body: "",
        workLogs: [{ id: "log-1", body: "", createdAt: "2026-03-31T00:00:00.000Z" }],
        status: "todo",
        dueDate: null,
        startDate: null,
        completedAt: null,
        createdAt: "2026-03-31T00:00:00.000Z",
        updatedAt: "2026-03-31T00:00:00.000Z",
      } as unknown as TaskRecord,
    ],
    viewState: {
      hasSelectedListTasksFilter: false,
      listTasksFilter: "all",
      hasSelectedListViewMode: false,
      listViewMode: "summary",
    },
  });

  assert.throws(() => parseRaylogMarkdown(markdown), RaylogParseError);
});

async function createTempMarkdownFile(contents: string): Promise<string> {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "raylog-"));
  const notePath = path.join(directory, "tasks.md");
  await fs.promises.writeFile(notePath, contents, "utf8");
  return notePath;
}
