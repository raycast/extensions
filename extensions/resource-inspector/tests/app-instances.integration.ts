import assert from "node:assert/strict";
import { execFile, spawn, ChildProcess } from "node:child_process";
import { mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import { promisify } from "node:util";
import { entities, Snapshot } from "../src/model";
import { nativeCall } from "../src/native";

// Only these disposable app processes are targeted. No windows or documents are opened.
const execute = promisify(execFile);
const binary = resolve("assets/inspector");
async function waitFor(check: () => Promise<boolean>) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await check()) return;
    await setTimeout(100);
  }
  throw new Error("Timed out waiting for disposable app state");
}
async function main() {
  const dir = await realpath(
    await mkdtemp(join(tmpdir(), "inspector-app-instances-")),
  );
  const app = join(dir, "Inspector Instance Fixture.app");
  const executable = join(app, "Contents/MacOS/InstanceFixture");
  const children: ChildProcess[] = [];
  try {
    await mkdir(join(app, "Contents/MacOS"), { recursive: true });
    await writeFile(
      join(app, "Contents/Info.plist"),
      `<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleExecutable</key><string>InstanceFixture</string><key>CFBundleIdentifier</key><string>local.resource-inspector.instance-fixture</string><key>CFBundleName</key><string>Inspector Instance Fixture</string><key>CFBundlePackageType</key><string>APPL</string><key>LSMultipleInstancesProhibited</key><false/></dict></plist>`,
    );
    const source = join(dir, "main.swift");
    await writeFile(
      source,
      `import AppKit
let app = NSApplication.shared
app.setActivationPolicy(.regular)
app.run()
`,
    );
    await execute("/usr/bin/swiftc", [source, "-o", executable], {
      timeout: 60000,
    });
    const snapshot = () => nativeCall<Snapshot>(binary, "snapshot");
    const first = spawn(executable, [], { stdio: "ignore" });
    children.push(first);
    let initial!: Snapshot;
    await waitFor(async () => {
      initial = await snapshot();
      return initial.processes.some(
        (p) => p.pid === first.pid && p.appPid === first.pid,
      );
    });
    const target = initial.processes.find((p) => p.pid === first.pid)!;
    const request = {
      pid: target.pid,
      start: target.start,
      executable: target.executable,
      boot: initial.boot,
    };
    const second = spawn(executable, [], { stdio: "ignore" });
    children.push(second);
    let multiple!: Snapshot;
    await waitFor(async () => {
      multiple = await snapshot();
      return [first.pid, second.pid].every((pid) =>
        multiple.processes.some(
          (p) =>
            p.pid === pid &&
            p.appBlockedReason?.includes("Multiple running instances"),
        ),
      );
    });
    const group = entities(multiple).find(
      (e) => e.kind === "app" && e.processes.some((p) => p.pid === first.pid),
    )!;
    assert.equal(group.target, undefined);
    assert.match(group.blockedReason!, /Multiple running instances/);
    assert.ok(group.processes.some((p) => p.pid === second.pid));
    // A request selected while there was one instance must also fail after a second appears.
    for (const action of ["quit-app", "force-app"]) {
      await assert.rejects(
        nativeCall(binary, "action", { ...request, action }),
        /Multiple running instances/,
      );
      assert.equal(first.exitCode, null);
      assert.equal(second.exitCode, null);
      assert.equal(first.signalCode, null);
      assert.equal(second.signalCode, null);
    }
    second.kill("SIGTERM");
    await waitFor(async () =>
      (await snapshot()).processes.some(
        (p) =>
          p.pid === first.pid && p.appPid === first.pid && !p.appBlockedReason,
      ),
    );
    assert.equal(
      (
        await nativeCall<{ status: string }>(binary, "action", {
          ...request,
          action: "quit-app",
        })
      ).status,
      "requested",
    );
    await waitFor(
      async () =>
        !(await snapshot()).processes.some((p) => p.pid === first.pid),
    );
    console.log(
      "PASS: multiple regular instances block normal and forced app actions; stale single-instance requests are rejected; one remaining instance quits normally.",
    );
  } finally {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null)
        child.kill("SIGTERM");
    }
    await waitFor(async () =>
      children.every(
        (child) => child.exitCode !== null || child.signalCode !== null,
      ),
    );
    await rm(dir, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
