import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, access, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearStaleHandoffs, runWithHandoff } from "../src/lib/handoff";

test("helper input is acknowledged only after consumption", async () => {
  const directory = await mkdtemp(join(tmpdir(), "json-handoff-"));
  const request = join(directory, "request.json");
  try {
    await writeFile(request, "synthetic input", { mode: 0o600 });
    await runWithHandoff(process.execPath, ["-e", 'require("node:fs").unlinkSync(process.argv[1])', request], request);
    await assert.rejects(access(request), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("failed and unresponsive helpers cannot leave the input handoff behind", async () => {
  const directory = await mkdtemp(join(tmpdir(), "json-handoff-failure-"));
  const request = join(directory, "request.json");
  try {
    for (const script of ["process.exit(1)", "setInterval(() => {}, 1000)"]) {
      await writeFile(request, "synthetic input", { mode: 0o600 });
      await assert.rejects(runWithHandoff(process.execPath, ["-e", script], request, 200), /editor/);
      await assert.rejects(access(request), { code: "ENOENT" });
    }
    await writeFile(request, "synthetic input", { mode: 0o600 });
    await assert.rejects(runWithHandoff(join(directory, "missing-helper"), [], request), { code: "ENOENT" });
    await assert.rejects(access(request), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("stale cleanup preserves recent handoffs and unrelated files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "json-handoff-stale-"));
  const old = join(directory, "input-00000000-0000-0000-0000-000000000000.json");
  const recent = join(directory, "input-11111111-1111-1111-1111-111111111111.json");
  const unrelated = join(directory, "document.json");
  try {
    for (const file of [old, recent, unrelated]) await writeFile(file, "synthetic input");
    await utimes(old, new Date(0), new Date(0));
    await utimes(unrelated, new Date(0), new Date(0));
    await clearStaleHandoffs(directory);
    await assert.rejects(access(old), { code: "ENOENT" });
    await access(recent);
    await access(unrelated);
  } finally {
    await rm(directory, { recursive: true });
  }
});
