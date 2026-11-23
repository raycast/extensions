import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { checkCoreAvailable, getRepairCopyText } from "../src/core-check";

test("a broken Python link reports the repair step without launching a process", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "paper-agent-broken-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".venv", "bin"), { recursive: true });
  fs.symlinkSync(path.join(root, "removed-python"), path.join(root, ".venv", "bin", "python3"));
  const configPath = path.join(root, "config.yaml");
  fs.writeFileSync(configPath, "delivery: {}\n");
  const result = await checkCoreAvailable({ configPath });
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /bootstrap script to repair/);
});

test("the repair command handles spaces and quotes in the installation path", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "paper agent's setup-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "scripts"));
  fs.writeFileSync(path.join(root, "scripts", "bootstrap.sh"), "#!/bin/sh\npwd\n", { mode: 0o755 });
  const command = getRepairCopyText(path.join(root, "config.yaml"));
  assert.ok(command);
  assert.equal(fs.realpathSync(execFileSync("/bin/sh", ["-c", command], { encoding: "utf8" }).trim()), fs.realpathSync(root));
  assert.equal(getRepairCopyText(""), undefined);
});
