import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  chmodSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { z } from "zod";
import {
  addTask,
  CliError,
  completeTask,
  findCli,
  myDay,
  myDaySuggestions,
  listTasks,
  listTaskLists,
  showTask,
  editTask,
  reopenTask,
  deleteTask,
  addToMyDay,
  removeFromMyDay,
} from "../src/cli";

const directories: string[] = [];
function fakeCli(output: string, exit = 0) {
  const dir = mkdtempSync(join(tmpdir(), "ms-todo-raycast-"));
  directories.push(dir);
  const path = join(dir, "ms-todo");
  const script = `#!/usr/bin/env node\nconst fs=require('node:fs');\nfs.writeFileSync(${JSON.stringify(join(dir, "args.json"))},JSON.stringify(process.argv.slice(2)));\nprocess.${exit ? "stderr" : "stdout"}.write(${JSON.stringify(output)});\nprocess.exit(${exit});\n`;
  writeFileSync(path, script);
  chmodSync(path, 0o755);
  return {
    path,
    args: () =>
      z
        .array(z.string())
        .parse(JSON.parse(readFileSync(join(dir, "args.json"), "utf8"))),
  };
}
afterEach(() => {
  for (const dir of directories.splice(0))
    rmSync(dir, { recursive: true, force: true });
});
const task = {
  id: "local-id",
  graph_id: "graph-id",
  title: "Call mum",
  status: "notStarted",
};
const ready = {
  schema_version: 2,
  sync: { state: "ready", generation: 4 },
  items: [task],
};

test("search loads all cached tasks once for local fuzzy filtering", async () => {
  const cli = fakeCli(JSON.stringify(ready));
  const result = await listTasks({ status: "all" }, cli.path);
  assert.equal(result.items[0]?.id, "local-id");
  assert.deepEqual(cli.args(), [
    "--format",
    "json",
    "tasks",
    "list",
    "--status",
    "all",
  ]);
});
test("My Day preserves initial sync state", async () => {
  const cli = fakeCli(
    JSON.stringify({
      ...ready,
      sync: { state: "initial", generation: 0 },
      items: [],
    }),
  );
  assert.equal((await myDay(cli.path)).sync.state, "initial");
  assert.deepEqual(cli.args(), ["--format", "json", "myday", "list"]);
});
test("add and complete use one argv value and local ID", async () => {
  const cli = fakeCli(
    JSON.stringify({
      schema_version: 2,
      action: "add",
      op_id: "op",
      items: [task],
    }),
  );
  await addTask("Call mum #Home tomorrow", cli.path);
  assert.deepEqual(cli.args(), [
    "--format",
    "json",
    "tasks",
    "add",
    "Call mum #Home tomorrow",
    "--strict",
  ]);
  const done = fakeCli(
    JSON.stringify({
      schema_version: 2,
      action: "complete",
      op_id: "op",
      items: [task],
    }),
  );
  await completeTask(task.id, done.path);
  assert.deepEqual(done.args(), [
    "--format",
    "json",
    "tasks",
    "complete",
    "local-id",
  ]);
});
test("missing CLI gives installation guidance", () => {
  assert.throws(() => findCli("/missing/ms-todo"), CliError);
});
test("nonzero JSON stderr exposes CLI message", async () => {
  const cli = fakeCli(
    JSON.stringify({
      error: { kind: "not_signed_in", message: "sign in first" },
    }),
    2,
  );
  await assert.rejects(myDay(cli.path), /sign in first/);
});
test("invalid JSON, wrong schema, and malformed collections fail visibly", async () => {
  await assert.rejects(myDay(fakeCli("not json").path), /invalid JSON/);
  await assert.rejects(
    myDay(fakeCli(JSON.stringify({ ...ready, schema_version: 3 })).path),
    /unsupported JSON schema/,
  );
  await assert.rejects(
    myDay(
      fakeCli(
        JSON.stringify({
          ...ready,
          items: [{ title: "no id", status: "notStarted" }],
        }),
      ).path,
    ),
    /incomplete task collection/,
  );
});
test("mutation requires a confirmed action", async () => {
  await assert.rejects(
    addTask(
      "hello",
      fakeCli(JSON.stringify({ schema_version: 2, action: "add", items: [] }))
        .path,
    ),
    /did not confirm.*may have happened; check tasks and outbox before retrying/,
  );
});
test("successful writes with unconfirmed responses warn before retrying", async () => {
  for (const output of [
    "not json",
    JSON.stringify({ schema_version: 3, action: "add", op_id: "op", items: [task] }),
    JSON.stringify({ schema_version: 2, action: "complete", op_id: "op", items: [task] }),
  ]) {
    await assert.rejects(
      addTask("hello", fakeCli(output).path),
      /may have happened; check tasks and outbox before retrying/,
    );
  }
});
test("My Day no-op mutation confirms with no changed items", async () => {
  for (const [action, run] of [
    ["my_day_add", addToMyDay],
    ["my_day_remove", removeFromMyDay],
  ] as const) {
    const cli = fakeCli(
      JSON.stringify({ schema_version: 2, action, op_id: "op", items: [] }),
    );
    await run(task.id, cli.path);
  }
});
test("task creation still requires a returned item", async () => {
  const cli = fakeCli(
    JSON.stringify({ schema_version: 2, action: "add", op_id: "op", items: [] }),
  );
  await assert.rejects(
    addTask("hello", cli.path),
    /did not confirm add.*may have happened; check tasks and outbox before retrying/,
  );
});
test("nonzero write errors retain the CLI's message", async () => {
  const cli = fakeCli(JSON.stringify({ error: { message: "unknown list" } }), 2);
  await assert.rejects(
    addTask("hello", cli.path),
    { name: "CliError", message: "unknown list" },
  );
});

test("list browsing and task details use local IDs", async () => {
  const lists = fakeCli(
    JSON.stringify({
      schema_version: 2,
      sync: ready.sync,
      items: [{ id: "list-local", displayName: "Home", folder: "Areas" }],
    }),
  );
  assert.equal((await listTaskLists(lists.path)).items[0]?.id, "list-local");
  assert.deepEqual(lists.args(), ["--format", "json", "lists", "list"]);
  const tasks = fakeCli(JSON.stringify(ready));
  await listTasks({ listId: "list-local", status: "all" }, tasks.path);
  assert.deepEqual(tasks.args(), [
    "--format",
    "json",
    "tasks",
    "list",
    "--status",
    "all",
    "--list",
    "list-local",
  ]);
  const detail = fakeCli(
    JSON.stringify({
      schema_version: 2,
      ...task,
      body: { content: "Some notes", contentType: "text" },
    }),
  );
  assert.equal(
    (await showTask(task.id, detail.path)).body?.content,
    "Some notes",
  );
  assert.deepEqual(detail.args(), [
    "--format",
    "json",
    "tasks",
    "show",
    "local-id",
  ]);
});

test("core mutations keep values in argv and confirm action", async () => {
  const edit = fakeCli(
    JSON.stringify({
      schema_version: 2,
      action: "edit",
      op_id: "op",
      items: [task],
    }),
  );
  await editTask(
    task.id,
    {
      title: "Buy milk; $(touch /tmp/bad)",
      due: "tomorrow",
      importance: "high",
    },
    edit.path,
  );
  assert.deepEqual(edit.args(), [
    "--format",
    "json",
    "tasks",
    "edit",
    "local-id",
    "--title",
    "Buy milk; $(touch /tmp/bad)",
    "--due",
    "tomorrow",
    "--importance",
    "high",
  ]);
  const clear = fakeCli(
    JSON.stringify({
      schema_version: 2,
      action: "edit",
      op_id: "op",
      items: [task],
    }),
  );
  await editTask(task.id, { due: "-" }, clear.path);
  assert.deepEqual(clear.args(), [
    "--format",
    "json",
    "tasks",
    "edit",
    "local-id",
    "--clear-due",
  ]);
  await assert.rejects(editTask(task.id, {}, edit.path), /at least one change/);
  for (const [action, command, run] of [
    ["reopen", ["tasks", "reopen", "local-id"], reopenTask],
    ["delete", ["tasks", "delete", "local-id", "--yes"], deleteTask],
    ["my_day_add", ["myday", "add", "local-id"], addToMyDay],
    ["my_day_remove", ["myday", "remove", "local-id"], removeFromMyDay],
  ] as const) {
    const cli = fakeCli(
      JSON.stringify({ schema_version: 2, action, op_id: "op", items: [task] }),
    );
    await run(task.id, cli.path);
    assert.deepEqual(cli.args(), ["--format", "json", ...command]);
  }
});

test("quick add can target a list ID", async () => {
  const cli = fakeCli(
    JSON.stringify({
      schema_version: 2,
      action: "add",
      op_id: "op",
      items: [task],
    }),
  );
  await addTask("Buy milk", cli.path, "list-local");
  assert.deepEqual(cli.args(), [
    "--format",
    "json",
    "tasks",
    "add",
    "Buy milk",
    "--list",
    "list-local",
    "--strict",
  ]);
});

test("My Day suggestions retain reason and local ID", async () => {
  const cli = fakeCli(
    JSON.stringify({
      schema_version: 2,
      sync: ready.sync,
      items: [{ ...task, suggestion: "due_today" }],
    }),
  );
  const suggestions = await myDaySuggestions(cli.path);
  assert.equal(suggestions.items[0]?.suggestion, "due_today");
  assert.deepEqual(cli.args(), ["--format", "json", "myday", "suggest"]);
});
