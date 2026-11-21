import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseRakeTaskLine, resolveRakePreferences, runProcess, runRake } from "../src/rake-utils.ts";

test("Rake preferences default to PATH and home, and expand leading home paths", () => {
  for (const preferences of [{}, { rakePath: "", directory: "" }, { rakePath: "  ", directory: "~" }]) {
    assert.deepEqual(resolveRakePreferences(preferences), { command: "rake", cwd: homedir() });
  }
  assert.deepEqual(resolveRakePreferences({ rakePath: "~/.rbenv/shims/rake", directory: "~/My Project" }), {
    command: join(homedir(), ".rbenv/shims/rake"),
    cwd: join(homedir(), "My Project"),
  });
  assert.deepEqual(resolveRakePreferences({ rakePath: "/opt/My Ruby/rake", directory: "/tmp/project~name" }), {
    command: "/opt/My Ruby/rake",
    cwd: "/tmp/project~name",
  });
});

test("uses the configured executable and directory for discovery and execution without shell expansion", async (t) => {
  const cwd = await realpath(await mkdtemp(join(tmpdir(), "rake project ")));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const rakePath = join(cwd, "rake shim; literal");
  const scriptPath = join(cwd, "fixture.cjs");
  await symlink(process.execPath, rakePath);
  await writeFile(join(cwd, "task.txt"), "rake greet[name]  # Say hello");
  await writeFile(
    scriptPath,
    `const fs = require("node:fs");
     if (process.argv[2] === "-T") {
       process.stdout.write(fs.readFileSync("task.txt", "utf8"));
     } else {
       process.stdout.write(JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }));
     }`,
  );

  const preferences = { rakePath, directory: cwd };
  const lines: string[] = [];
  await runRake([scriptPath, "-T"], preferences, (line) => lines.push(line));
  assert.deepEqual(lines.map(parseRakeTaskLine), [{ name: "greet", args: ["name"], description: "Say hello" }]);

  const invocation = "greet[$HOME; $(printf injected),`printf injected`]";
  const result = await runRake([scriptPath, invocation], preferences);
  assert.deepEqual(JSON.parse(result.stdout), { cwd, args: [invocation] });
});

test("missing Rake executables point users to Rake Executable preferences", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "rake-missing-executable-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await assert.rejects(runRake(["-T"], { rakePath: join(directory, "missing-rake"), directory }), (error: Error) => {
    assert.equal(error.message, "rake not found — set Rake Executable in preferences.");
    assert.ok(error.cause instanceof Error && "code" in error.cause);
    assert.equal(error.cause.code, "ENOENT");
    return true;
  });
});

test("missing directories and files used as directories point to Rake Directory preferences", async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), "rake-invalid-directory-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const file = join(cwd, "file");
  await writeFile(file, "not a directory");

  for (const directory of [join(cwd, "missing"), file]) {
    await assert.rejects(runRake(["-T"], { rakePath: process.execPath, directory }), (error: Error) => {
      assert.match(error.message, /Set Rake Directory in preferences/);
      assert.ok(error.message.includes(directory));
      assert.doesNotMatch(error.message, /rake not found/);
      return true;
    });
  }
});

test("Rake task failures retain their diagnostics instead of suggesting an executable change", async () => {
  await assert.rejects(
    runRake(["-e", 'console.error("ENOENT: task input missing"); process.exitCode = 7;'], {
      rakePath: process.execPath,
      directory: tmpdir(),
    }),
    /exited with code 7\nENOENT: task input missing/,
  );
});

test("non-executable Rake paths retain the permission error", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "rake-permissions-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const rakePath = join(directory, "rake");
  await writeFile(rakePath, "not executable", { mode: 0o644 });
  await assert.rejects(runRake(["-T"], { rakePath, directory }), { code: "EACCES" });
});

test("parses names containing spaces, namespaces, arguments, and descriptions", () => {
  assert.deepEqual(parseRakeTaskLine("rake my task  # Run a task with spaces"), {
    name: "my task",
    args: [],
    description: "Run a task with spaces",
  });
  assert.deepEqual(parseRakeTaskLine("rake admin:my task[first, second]   # Run #1 [again]"), {
    name: "admin:my task",
    args: ["first", "second"],
    description: "Run #1 [again]",
  });
  assert.deepEqual(parseRakeTaskLine("rake greet[name]  # Say hello"), {
    name: "greet",
    args: ["name"],
    description: "Say hello",
  });
  assert.deepEqual(parseRakeTaskLine("rake task without comment"), {
    name: "task without comment",
    args: [],
    description: "",
  });
  assert.equal(parseRakeTaskLine(""), null);
  assert.equal(parseRakeTaskLine("Loading tasks..."), null);
});

test("verbose processes finish their work and retain only bounded output tails", async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), "rake-output-test-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const script = `
    const fs = require("node:fs");
    const output = Buffer.alloc(2 * 1024 * 1024, "x");
    fs.writeSync(1, output);
    fs.writeSync(2, output);
    fs.writeFileSync("completed.txt", "completed");
    fs.writeSync(1, "stdout completed");
    fs.writeSync(2, "stderr completed");
  `;

  const result = await runProcess(process.execPath, ["-e", script], { cwd });

  assert.equal(await readFile(join(cwd, "completed.txt"), "utf8"), "completed");
  for (const stream of ["stdout", "stderr"] as const) {
    assert.match(result[stream], /^\[Earlier output omitted\]/);
    assert.ok(result[stream].endsWith(`${stream} completed`));
    assert.ok(result[stream].length < 17_000);
  }
});

test("task discovery reads all lines even when the retained output is truncated", async () => {
  const tasks = [];
  const script = `
    const { writeSync } = require("node:fs");
    for (let i = 0; i < 40_000; i++) writeSync(1, "rake task " + i + "[name]  # Example task\\r\\n");
    writeSync(1, "rake final task  # No trailing newline");
  `;
  const result = await runProcess(process.execPath, ["-e", script], {
    cwd: tmpdir(),
    onStdoutLine(line) {
      const task = parseRakeTaskLine(line);
      if (task) tasks.push(task);
    },
  });

  assert.equal(tasks.length, 40_001);
  assert.equal(tasks[0].name, "task 0");
  assert.deepEqual(tasks.at(-1), { name: "final task", args: [], description: "No trailing newline" });
  assert.match(result.stdout, /^\[Earlier output omitted\]/);
});

test("passes task names, spaces, and shell metacharacters as one literal argument", async () => {
  const invocation = "my task[$HOME; $(printf injected),`printf injected`]";
  const result = await runProcess(process.execPath, ["-e", "process.stdout.write(process.argv[1])", invocation], {
    cwd: tmpdir(),
  });
  assert.equal(result.stdout, invocation);
  assert.equal(result.stderr, "");
});

test("reports nonzero exits with the final error output", async () => {
  await assert.rejects(
    runProcess(
      process.execPath,
      [
        "-e",
        'const fs = require("node:fs"); fs.writeSync(2, Buffer.alloc(2 * 1024 * 1024, "x")); fs.writeSync(2, "task failed"); process.exitCode = 7;',
      ],
      { cwd: tmpdir() },
    ),
    (error: Error) => {
      assert.match(error.message, /exited with code 7/);
      assert.ok(error.message.endsWith("task failed"));
      assert.ok(error.message.length < 18_000);
      return true;
    },
  );
});

test("reports missing executables", async () => {
  await assert.rejects(runProcess("/nonexistent/rake-test-executable", [], { cwd: tmpdir() }), { code: "ENOENT" });
});

test("reports termination signals", async () => {
  await assert.rejects(
    runProcess(process.execPath, ["-e", 'process.kill(process.pid, "SIGTERM")'], { cwd: tmpdir() }),
    /terminated by SIGTERM/,
  );
});

test("closes stdin and correctly decodes UTF-8 split across writes", async () => {
  const script = `
    const fs = require("node:fs");
    if (fs.readFileSync(0).length !== 0) process.exit(1);
    const text = Buffer.from("完了🙂");
    fs.writeSync(1, text.subarray(0, 2));
    setTimeout(() => fs.writeSync(1, text.subarray(2)), 10);
  `;
  const result = await runProcess(process.execPath, ["-e", script], { cwd: tmpdir() });
  assert.equal(result.stdout, "完了🙂");
});
