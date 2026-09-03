import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  accessibilitySettingsURL,
  CommandRunner,
  classifyLaunchctlPrintFailure,
  inputMonitoringSettingsURL,
  inspectCodesignIdentity,
  launchAgentPlist,
  MacOSHelperLifecycle,
  canStart,
  permissionState,
  repairDisposition,
  staleRuntimeRecordCleanupDisposition,
} from "../src/adapters/macos/helper-lifecycle";
import { NativeHelperClient } from "../src/adapters/native/native-helper-client";

test("escapes every path interpolated into the LaunchAgent plist", () => {
  const plist = launchAgentPlist({
    installedExecutable: "/tmp/a&b<mouse>",
    config: "/tmp/profile'quote.json",
    state: '/tmp/state"quote.json',
    permissionMarker: "/tmp/permission",
    launchAgent: "/tmp/agent.plist",
    label: "com.example.&<mouse>",
    stdoutLog: "/tmp/out&log",
    stderrLog: "/tmp/error&log",
  });
  assert.match(plist, /a&amp;b&lt;mouse&gt;/);
  assert.match(plist, /profile&apos;quote/);
  assert.match(plist, /state&quot;quote/);
  assert.doesNotMatch(plist, /<string>\/tmp\/a&b<mouse><\/string>/);
});

test("maps only known launchctl absence to bootstrap and preserves real errors", () => {
  assert.equal(classifyLaunchctlPrintFailure("Could not find service in domain"), "missing");
  assert.equal(classifyLaunchctlPrintFailure("No such process"), "missing");
  assert.equal(classifyLaunchctlPrintFailure("Input/output error"), "failed");
});

test("accepts only Apple signing authority with a team and rejects installed-path mismatch", () => {
  const signed =
    "Authority=Apple Development: Example (TEAM123)\nTeamIdentifier=TEAM123\nIdentifier=com.brandon.mouse-scroll-per-device.helper";
  assert.equal(
    inspectCodesignIdentity(signed, "/Library/Application Support/MouseScrollPerDevice/bin/mouse-scroll-helper").state,
    "valid",
  );
  assert.equal(
    inspectCodesignIdentity(
      "Authority=Apple Development: Example\nTeamIdentifier=TEAM123\nIdentifier=wrong.helper",
      "/tmp/helper",
    ).state,
    "invalid",
  );
  assert.equal(inspectCodesignIdentity("Signature=adhoc\nTeamIdentifier=not set", "/tmp/helper").state, "invalid");
  assert.equal(
    inspectCodesignIdentity(
      "Authority=Apple Development: Example\nTeamIdentifier=not set\nIdentifier=com.brandon.mouse-scroll-per-device.helper",
      "/tmp/helper",
    ).state,
    "invalid",
  );
  assert.equal(
    inspectCodesignIdentity(
      "Authority=Apple Development: Example\nTeamIdentifier=TEAM123\nIdentifier=com.brandon.mouse-scroll-per-device.helper.evil",
      "/tmp/helper",
    ).state,
    "invalid",
  );
  assert.equal(
    inspectCodesignIdentity(
      signed,
      "/tmp/helper",
      "/Library/Application Support/MouseScrollPerDevice/bin/mouse-scroll-helper",
    ).state,
    "pathMismatch",
  );
});

test("uses explicit macOS Settings destinations without opening them in tests", () => {
  assert.match(inputMonitoringSettingsURL, /Privacy_ListenEvent/);
  assert.match(accessibilitySettingsURL, /Privacy_Accessibility/);
});

test("models prompt grace, later denial, grants, start gate, and safe repair", () => {
  assert.equal(permissionState(false, true, 0), "notDetermined");
  assert.equal(permissionState(false, true, 30_001), "denied");
  assert.equal(permissionState(true, true, 0), "granted");
  assert.equal(canStart("stopped", { inputMonitoring: "granted", accessibility: "granted" }), true);
  assert.equal(canStart("stopped", { inputMonitoring: "granted", accessibility: "denied" }), false);
  assert.equal(repairDisposition("stale"), "stopThenInstall");
  assert.equal(repairDisposition("identityMismatch"), "refuse");
});

test("clears only a confirmed stale runtime record after launchctl safely stops or finds the service absent", () => {
  assert.equal(staleRuntimeRecordCleanupDisposition("stale", "bootedOut"), "clearRecord");
  assert.equal(staleRuntimeRecordCleanupDisposition("stale", "alreadyAbsent"), "clearRecord");
  assert.equal(staleRuntimeRecordCleanupDisposition("stale", "failed"), "preserveRecord");
  assert.equal(staleRuntimeRecordCleanupDisposition("identityMismatch", "bootedOut"), "preserveRecord");
  assert.equal(staleRuntimeRecordCleanupDisposition("running", "bootedOut"), "preserveRecord");
});

function signedInspection() {
  return [
    "Authority=Apple Development: Example (TEAM123)",
    "TeamIdentifier=TEAM123",
    "Identifier=com.brandon.mouse-scroll-per-device.helper",
  ].join("\n");
}

async function staleLifecycleFixture(runtimeState: "stale" | "identityMismatch", bootout: "absent" | "failure") {
  const directory = await mkdtemp(join(tmpdir(), "mouse-scroll-lifecycle-"));
  const packaged = join(directory, "packaged-helper");
  const installed = join(directory, "Application Support", "bin", "mouse-scroll-helper");
  const state = join(directory, "runtime.json");
  const paths = {
    installedExecutable: installed,
    config: join(directory, "profiles.json"),
    state,
    permissionMarker: join(directory, "permissions"),
    launchAgent: join(directory, "LaunchAgents", "helper.plist"),
    label: "com.example.mouse-scroll-helper",
    stdoutLog: join(directory, "logs", "out.log"),
    stderrLog: join(directory, "logs", "error.log"),
  };
  await writeFile(packaged, "helper");
  await mkdir(join(directory, "Application Support", "bin"), { recursive: true });
  await writeFile(installed, "helper");
  await writeFile(state, "stale record");

  const client = {
    packagedPath: packaged,
    installedPath: installed,
    statePath: state,
    async runtimeStatus() {
      try {
        await access(state);
      } catch {
        return { status: "succeeded" as const, value: { protocolVersion: 1 as const, state: "stopped" as const } };
      }
      return { status: "succeeded" as const, value: { protocolVersion: 1 as const, state: runtimeState } };
    },
    async access() {
      return {
        status: "succeeded" as const,
        value: { protocolVersion: 1 as const, inputMonitoring: false, accessibility: false },
      };
    },
  } as unknown as NativeHelperClient;
  let commandCalls = 0;
  const runner: CommandRunner = async (executable, arguments_) => {
    if (executable === "/usr/bin/codesign" && arguments_[0] === "-dv") {
      return { stdout: signedInspection(), stderr: "" };
    }
    if (executable === "/usr/bin/codesign") return { stdout: "", stderr: "" };
    if (executable === "/bin/launchctl" && arguments_[0] === "bootout") {
      commandCalls += 1;
      if (bootout === "absent") {
        throw Object.assign(new Error("No such process"), { stderr: "No such process" });
      }
      throw Object.assign(new Error("Input/output error"), { stderr: "Input/output error" });
    }
    throw new Error(`Unexpected command: ${executable} ${arguments_.join(" ")}`);
  };
  return {
    directory,
    lifecycle: new MacOSHelperLifecycle(client, paths, async () => undefined, runner),
    state,
    commandCalls: () => commandCalls,
  };
}

test("repair clears a confirmed stale record only after known-absent bootout and reaches stopped install state", async () => {
  const fixture = await staleLifecycleFixture("stale", "absent");
  try {
    const result = await fixture.lifecycle.repair();
    assert.equal(result.status, "succeeded");
    if (result.status === "succeeded") assert.equal(result.value.state, "stopped");
    await assert.rejects(access(fixture.state));
    assert.equal(fixture.commandCalls(), 1);
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test("repair preserves mismatched ownership and records when bootout fails", async () => {
  const mismatch = await staleLifecycleFixture("identityMismatch", "absent");
  const failure = await staleLifecycleFixture("stale", "failure");
  try {
    const mismatchResult = await mismatch.lifecycle.repair();
    assert.equal(mismatchResult.status, "unavailable");
    await access(mismatch.state);
    assert.equal(mismatch.commandCalls(), 0);

    const failureResult = await failure.lifecycle.repair();
    assert.equal(failureResult.status, "failed");
    await access(failure.state);
    assert.equal(failure.commandCalls(), 1);
  } finally {
    await Promise.all([
      rm(mismatch.directory, { recursive: true, force: true }),
      rm(failure.directory, { recursive: true, force: true }),
    ]);
  }
});
