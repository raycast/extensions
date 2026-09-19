import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import { nativeCall } from "../src/native";
import { Snapshot } from "../src/model";
import { listContainers, stopContainer } from "../src/containers";
const binary = resolve("assets/inspector"),
  exec = promisify(execFile);
async function main() {
  const child = spawn("/bin/sleep", ["120"], { stdio: "ignore" });
  try {
    const snapshot = await nativeCall<Snapshot>(binary, "snapshot");
    const target = snapshot.processes.find((p) => p.pid === child.pid)!;
    assert.ok(target);
    assert.equal(target.blockedReason, null);
    const request = {
      pid: target.pid,
      start: target.start,
      executable: target.executable,
      boot: snapshot.boot,
      action: "stop-process",
    };
    await assert.rejects(
      nativeCall(binary, "action", { ...request, start: "wrong-start" }),
      /changed/,
    );
    assert.equal(child.exitCode, null);
    const own = snapshot.processes.find((p) => p.pid === process.pid)!;
    await assert.rejects(
      nativeCall(binary, "action", {
        pid: own.pid,
        start: own.start,
        executable: own.executable,
        boot: snapshot.boot,
        action: "stop-process",
      }),
      /protected/,
    );
    assert.equal(
      (await nativeCall<{ status: string }>(binary, "action", request)).status,
      "requested",
    );
    await setTimeout(100);
    assert.equal(child.signalCode, "SIGTERM");
    assert.equal(
      (await nativeCall<{ status: string }>(binary, "action", request)).status,
      "exited",
    );
    console.log(
      "PASS: stale process refused, inspector protected, disposable process gracefully terminated, already-exited target handled",
    );
  } finally {
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGKILL");
  }
  const name = `resource-inspector-disposable-${Date.now()}`;
  const docker = (args: string[]) =>
    exec("/usr/local/bin/docker", ["--context", "orbstack", ...args], {
      timeout: 30000,
    });
  const created = await docker([
    "run",
    "--detach",
    "--name",
    name,
    "--label",
    "resource-inspector.disposable=true",
    "--entrypoint",
    "/bin/sh",
    "redis:7-alpine",
    "-c",
    "trap '' TERM; while :; do sleep 1; done",
  ]);
  const id = created.stdout.trim();
  try {
    const target = (await listContainers()).find((c) => c.id === id)!;
    assert.ok(target);
    await assert.rejects(
      stopContainer({ ...target, startedAt: "wrong-start" }, false),
      /restarted/,
    );
    const status = await stopContainer(target, false);
    assert.equal(status, "requested");
    assert.equal(
      (
        await docker(["inspect", "--format", "{{.State.Running}}", id])
      ).stdout.trim(),
      "true",
    );
    assert.equal(await stopContainer(target, true), "exited");
    assert.equal(
      (
        await docker(["inspect", "--format", "{{.State.Running}}", id])
      ).stdout.trim(),
      "false",
    );
    console.log(
      "PASS: disposable container refused TERM and remained running; only a separate force action stopped it",
    );
  } finally {
    await docker(["rm", "--force", id]);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
