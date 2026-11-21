import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(await readFile(new URL("../src/lib/install.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
}).outputText;

function installer(supportPath, openError) {
  const opened = [];
  const messages = [];
  const failures = [];
  const module = { exports: {} };
  new Function("require", "module", "exports", source)(
    (id) => {
      if (id === "@raycast/api") {
        return {
          environment: { supportPath },
          open: async (...args) => {
            if (openError) throw openError;
            opened.push(args);
          },
          showHUD: async (message) => messages.push(message),
        };
      }
      if (id === "@raycast/utils") return { showFailureToast: async (...args) => failures.push(args) };
      return require(id);
    },
    module,
    module.exports,
  );
  return { run: module.exports.installInTerminal, opened, messages, failures };
}

test("installer writes an executable script with valid Bash syntax and opens it in Terminal", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "fsearch-install-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const supportPath = join(dir, "Application Support");
  const h = installer(supportPath);
  await h.run();
  const scriptPath = join(supportPath, "install-fsearch.command");
  assert.deepEqual(h.opened, [[scriptPath, "com.apple.Terminal"]]);
  assert.equal((await stat(scriptPath)).mode & 0o777, 0o700);
  execFileSync("/bin/bash", ["-n", scriptPath]);
  assert.equal(h.failures.length, 0);
  assert.deepEqual(h.messages, ["FSearch installer opened in Terminal"]);
});

test("filesystem failure is reported without launching Terminal or claiming success", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "fsearch-install-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const supportPath = join(dir, "not-a-directory");
  await writeFile(supportPath, "existing file");
  const h = installer(supportPath);
  await h.run();
  assert.equal(h.opened.length, 0);
  assert.equal(h.messages.length, 0);
  assert.equal(h.failures.length, 1);
  assert.equal(h.failures[0][1].title, "Couldn't Open FSearch Installer");
});

test("Terminal launch failure is reported without a success HUD", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "fsearch-install-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const error = new Error("Terminal could not be opened");
  const h = installer(dir, error);
  await h.run();
  assert.equal(h.messages.length, 0);
  assert.deepEqual(h.failures, [[error, { title: "Couldn't Open FSearch Installer" }]]);
});
