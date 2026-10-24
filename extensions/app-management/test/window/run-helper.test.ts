// Copied from raycast-window-switcher test/run-helper.test.ts on 2026-09-30, unchanged except this header, import paths, and the
// architectureFailure and failureText tests
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { architectureFailure, failureText, runHelper } from "../../src/lib/window/run-helper.ts";

const dir = mkdtempSync(join(tmpdir(), "aws-helper-"));
function fake(name: string, body: string, mode = 0o755): string {
  const p = join(dir, name);
  writeFileSync(p, `#!/bin/sh\n${body}\n`);
  chmodSync(p, mode);
  return p;
}

test("A-8 success returns stdout", async () => {
  const r = await runHelper(fake("ok", `echo '{"schema":1}'`), ["list"], 2000);
  assert.ok(r.ok && r.stdout.includes("schema"));
});

test("A-8 missing helper", async () => {
  const r = await runHelper(join(dir, "nope"), ["list"], 2000);
  assert.ok(!r.ok && r.failure.kind === "helper-missing");
});

test("A-8 lost execute bit is repaired", async () => {
  const p = fake("noexec", `echo '{"schema":1}'`, 0o644);
  const r = await runHelper(p, ["list"], 2000);
  assert.ok(r.ok);
  assert.ok((statSync(p).mode & 0o100) !== 0);
});

test("A-8 timeout", async () => {
  const r = await runHelper(fake("slow", "sleep 5"), ["list"], 300);
  assert.ok(!r.ok && r.failure.kind === "timeout");
});

test("A-8 non-zero exit with JSON is passed to the parser; without JSON it is a helper error", async () => {
  const withJson = await runHelper(fake("usage", `echo '{"schema":1,"ok":false,"code":"usage"}'; exit 2`), [], 2000);
  assert.ok(withJson.ok);
  const crash = await runHelper(fake("crash", "echo boom >&2; exit 3"), [], 2000);
  assert.ok(!crash.ok && crash.failure.kind === "helper-error" && crash.failure.detail.includes("boom"));
});

test("arm64 runs the helper; any other architecture fails before it runs", () => {
  assert.equal(architectureFailure("arm64"), undefined);
  for (const arch of ["x64", "ia32"]) {
    const r = architectureFailure(arch);
    assert.ok(r && !r.ok && r.failure.kind === "unsupported-architecture");
    assert.equal(failureText(r.failure).title, "Requires a Mac with Apple silicon");
  }
});

test("no failure text tells a Store user to run npm", () => {
  const kinds = ["helper-missing", "helper-not-executable", "version-mismatch", "unsupported-architecture"] as const;
  for (const kind of kinds) {
    const { title, description } = failureText({ kind, detail: "" });
    assert.doesNotMatch(`${title} ${description}`, /npm|rebuild|re-import/i);
  }
});
