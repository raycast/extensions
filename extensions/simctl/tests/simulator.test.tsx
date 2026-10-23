import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { mkdirSync, mkdtempSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, mock, test } from "node:test";
import { promisify } from "node:util";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { failures } from "./mocks/utils";

const root = mkdtempSync(join(tmpdir(), "simctl-test-"));
const developerDirectory = join(root, "Xcode Beta.app", "Contents", "Developer");
const hub = join(root, "Xcode Beta.app", "Contents", "Applications", "DeviceHub.app");
const simulator = join(developerDirectory, "Applications", "Simulator.app");
mkdirSync(hub, { recursive: true });
mkdirSync(simulator, { recursive: true });

const originalDeveloperDirectory = process.env.DEVELOPER_DIR;
const calls: { file: string; args: string[] }[] = [];
let failure: string | undefined;
let listCallback: (error: Error | null, stdout: string) => void;
// execFile has a custom promisify implementation; replace both call forms at the process boundary.
const originalExecFile = childProcess.execFile;
const fakeExecFile = Object.assign(() => {}, {
  [promisify.custom]: async (file: string, args: string[]) => {
    calls.push({ file, args });
    if (file === failure) throw new Error(`${file} failed`);
    return { stdout: file === "xcode-select" ? `${developerDirectory}\n` : "", stderr: "" };
  },
});
childProcess.execFile = fakeExecFile as unknown as typeof childProcess.execFile;
mock.method(childProcess, "exec", (_command: string, callback: typeof listCallback) => {
  listCallback = callback;
});

let openSimulator: typeof import("../src/simulator").openSimulator;
let Command: typeof import("../src/index").default;
before(async () => {
  ({ openSimulator } = await import("../src/simulator"));
  ({ default: Command } = await import("../src/index"));
});

beforeEach(() => {
  delete process.env.DEVELOPER_DIR;
  calls.length = 0;
  failures.length = 0;
  failure = undefined;
});

after(() => {
  if (originalDeveloperDirectory === undefined) delete process.env.DEVELOPER_DIR;
  else process.env.DEVELOPER_DIR = originalDeveloperDirectory;
  // These directories contain no user data or files; remove only the empty test hierarchy.
  for (const path of [
    hub,
    join(hub, ".."),
    simulator,
    join(simulator, ".."),
    developerDirectory,
    join(developerDirectory, ".."),
    join(developerDirectory, "../.."),
    root,
  ]) {
    try {
      rmdirSync(path);
    } catch {
      /* A test may already have removed a directory. */
    }
  }
  mock.restoreAll();
  childProcess.execFile = originalExecFile;
});

test("opens the selected device in Xcode 27 Device Hub without booting an already booted device", async () => {
  await openSimulator({ udid: "device-id", name: 'iPhone\'s "Test"', state: "Booted" });
  assert.deepEqual(calls, [
    { file: "xcode-select", args: ["-p"] },
    { file: "open", args: ["-a", hub, "devices://device/open?id=device-id"] },
  ]);
});

test("honors DEVELOPER_DIR and boots before opening the window", async () => {
  process.env.DEVELOPER_DIR = developerDirectory;
  await openSimulator({ udid: "device-id", name: 'iPhone\'s "Test"', state: "Shutdown" });
  assert.deepEqual(calls, [
    { file: "xcrun", args: ["simctl", "boot", "device-id"] },
    { file: "open", args: ["-a", hub, "devices://device/open?id=device-id"] },
  ]);
});

test("does not open a window after boot fails", async () => {
  failure = "xcrun";
  await assert.rejects(
    openSimulator({ udid: "device-id", name: 'iPhone\'s "Test"', state: "Shutdown" }),
    /xcrun failed/,
  );
  assert.equal(
    calls.some((call) => call.file === "open"),
    false,
  );
});

test("accepts DEVELOPER_DIR pointing to an Xcode application bundle", async () => {
  process.env.DEVELOPER_DIR = join(root, "Xcode Beta.app");
  await openSimulator({ udid: "device-id", name: 'iPhone\'s "Test"', state: "Booted" });
  assert.deepEqual(calls, [{ file: "open", args: ["-a", hub, "devices://device/open?id=device-id"] }]);
});

test("reports an application launch failure", async () => {
  failure = "open";
  await assert.rejects(openSimulator({ udid: "device-id", name: 'iPhone\'s "Test"', state: "Booted" }), /open failed/);
});

test("keeps support for the Simulator bundled with older Xcode versions", async () => {
  rmdirSync(hub);
  try {
    await openSimulator({ udid: "device-id", name: 'iPhone\'s "Test"', state: "Booted" });
    assert.deepEqual(
      calls.find((call) => call.file === "open"),
      {
        file: "open",
        args: ["-a", simulator, "--args", "-CurrentDeviceUDID", "device-id"],
      },
    );
    const focus = calls.find((call) => call.file === "osascript");
    assert.ok(focus, "an already running Simulator must raise the selected device window");
    assert.equal(focus.args[2], 'iPhone\'s "Test"');
    assert.match(focus.args[1], /repeat 100 times/);
    assert.equal(focus.args[1].includes("iPhone's"), false, "device names must not be interpolated into AppleScript");
  } finally {
    mkdirSync(hub);
  }
});

test("reports a selected Xcode without a simulator application before booting", async () => {
  process.env.DEVELOPER_DIR = join(root, "CommandLineTools");
  await assert.rejects(
    openSimulator({ udid: "device-id", name: 'iPhone\'s "Test"', state: "Shutdown" }),
    /selected Xcode/,
  );
  assert.deepEqual(calls, []);
});

function deviceList(count: number) {
  return JSON.stringify({
    devices: {
      "com.apple.CoreSimulator.SimRuntime.iOS-27-0": Array.from({ length: count }, (_, id) => ({
        udid: `device-${id}`,
        name: `iPhone ${id}`,
        state: "Shutdown",
        isAvailable: true,
      })),
    },
  });
}

test("renders devices after an initially empty list and remains stable when the device count changes", () => {
  const consoleError = mock.method(console, "error", () => {});
  let renderer: ReactTestRenderer;
  act(() => {
    renderer = create(createElement(Command));
  });
  assert.equal(renderer!.root.findByType("list").props.isLoading, true);
  act(() => {
    listCallback(null, deviceList(2));
  });
  assert.equal(renderer!.root.findAllByType("item").length, 2);
  act(() => {
    listCallback(null, deviceList(1));
  });
  assert.equal(renderer!.root.findAllByType("item").length, 1);
  act(() => {
    listCallback(null, deviceList(0));
  });
  assert.equal(renderer!.root.findAllByType("item").length, 0);
  assert.equal(renderer!.root.findByType("list").props.isLoading, false);
  act(() => {
    renderer!.unmount();
  });
  assert.equal(consoleError.mock.callCount(), 0, "React must not report a change in Hooks order");
  consoleError.mock.restore();
});

test("surfaces simctl failures and invalid JSON instead of silently showing an empty list", () => {
  let renderer: ReactTestRenderer;
  act(() => {
    renderer = create(createElement(Command));
  });
  act(() => {
    listCallback(new Error("simctl failed"), "");
  });
  assert.equal(failures.length, 1);
  assert.equal(renderer!.root.findByType("list").props.isLoading, false);
  act(() => {
    listCallback(null, "invalid JSON");
  });
  assert.equal(failures.length, 2);
  assert.equal(renderer!.root.findByType("list").props.isLoading, false);
  act(() => {
    renderer!.unmount();
  });
});
