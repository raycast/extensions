import * as assert from "node:assert/strict";
import { test } from "node:test";
import { getProcessListCommandSpec, isMac, parseWindowsProcesses } from "../src/utils/platform";

test("uses direct ps invocation for macOS process listing", () => {
  if (!isMac) {
    return;
  }

  assert.deepEqual(getProcessListCommandSpec(), {
    executable: "ps",
    args: ["-eo", "pid,ppid,pcpu,rss,comm"],
  });
});

const windowsProcess = (path: string) =>
  JSON.stringify([{ pid: 10, ppid: 4, name: "App", cpu: 0, mem: 100, path }]);

test("keeps extended length windows paths pointing at the same file", () => {
  const cases: [string, string][] = [
    [String.raw`\\?\C:\Program Files\App\App.exe`, String.raw`C:\Program Files\App\App.exe`],
    [String.raw`C:\Program Files\App\App.exe`, String.raw`C:\Program Files\App\App.exe`],
    [String.raw`\\?\UNC\server\share\App.exe`, String.raw`\\server\share\App.exe`],
    [String.raw`\\server\share\App.exe`, String.raw`\\server\share\App.exe`],
    ["", ""],
  ];

  for (const [input, expected] of cases) {
    assert.equal(parseWindowsProcesses(windowsProcess(input))[0]?.path, expected, input);
  }
});

test("keeps the parent process id from the windows process list", () => {
  assert.equal(parseWindowsProcesses(windowsProcess("C:\\App.exe"))[0]?.pid, 4);
});
