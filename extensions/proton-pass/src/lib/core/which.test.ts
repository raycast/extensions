import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path, { delimiter } from "node:path";
import { findExecutable } from "./which";

test("skips a directory and returns the later file", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "proton-pass-which-"));
  try {
    const blocked = path.join(root, "blocked");
    const ready = path.join(root, "ready");
    await mkdir(path.join(blocked, "pass-cli"), { recursive: true });
    await mkdir(ready);
    const executable = path.join(ready, "pass-cli");
    await writeFile(executable, "ready");
    await chmod(executable, 0o755);

    assert.equal(findExecutable("pass-cli", [blocked, ready].join(delimiter)), executable);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("skips a file without an execute bit", { skip: process.platform === "win32" }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), "proton-pass-which-mode-"));
  try {
    const blocked = path.join(root, "blocked");
    const ready = path.join(root, "ready");
    await mkdir(blocked);
    await mkdir(ready);
    await writeFile(path.join(blocked, "pass-cli"), "blocked");
    await chmod(path.join(blocked, "pass-cli"), 0o644);
    const executable = path.join(ready, "pass-cli");
    await writeFile(executable, "ready");
    await chmod(executable, 0o755);

    assert.equal(findExecutable("pass-cli", [blocked, ready].join(delimiter)), executable);
    assert.equal(findExecutable("pass-cli", blocked), undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("does not search a command that is already a path", () => {
  assert.equal(findExecutable("/usr/bin/pass-cli", "/usr/bin"), undefined);
  assert.equal(findExecutable("", "/usr/bin"), undefined);
});
