import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkCoreUpdate,
  describeCoreUpdate,
  parseCoreInstallation,
  readCoreInstallation,
} from "../src/installation-status";

test("core inspection preserves an unpackaged installation instead of inventing a version", () => {
  const installed = { version: null, pythonVersion: "3.14.0", modulePath: "/core/paper_agent/__init__.py" };
  assert.deepEqual(parseCoreInstallation(JSON.stringify(installed)), installed);
  assert.match(describeCoreUpdate(installed.version, "0.4.2"), /cannot be compared/);
});

test("invalid core output is an error without echoing the subprocess response", () => {
  for (const output of ["private-config-value", "null", "[]", '{"version":42}']) {
    assert.throws(() => parseCoreInstallation(output), /Could not read the core version/);
  }
});

test("version comparison handles numeric components and development versions", () => {
  assert.match(describeCoreUpdate("0.4.2", "0.4.2"), /Up to date/);
  assert.match(describeCoreUpdate("0.4.2", "0.10.0"), /Update available/);
  assert.match(describeCoreUpdate("0.5.0", "0.4.2"), /newer than/);
  assert.match(describeCoreUpdate("0.5.0.dev1", "0.4.2"), /cannot be compared/);
});

test("a missing Python executable is reported independently of run history", async () => {
  await assert.rejects(
    readCoreInstallation(
      { configPath: "/tmp/config.yaml", pythonPath: "/nonexistent/python" },
      new AbortController().signal,
    ),
    /Cannot start Python/,
  );
});

test("release checks use the official release tag and reject failed or malformed responses", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.equal(url, "https://api.github.com/repos/galleonli/paper-agent/releases/latest");
    return Response.json({ tag_name: "v0.4.2" });
  });
  const signal = new AbortController().signal;
  assert.match(await checkCoreUpdate(Promise.resolve("0.4.1"), signal), /Update available/);
  fetchMock.mock.mockImplementation(async () => new Response("rate limited", { status: 403 }));
  await assert.rejects(checkCoreUpdate(Promise.resolve("0.4.1"), signal), /HTTP 403/);
  fetchMock.mock.mockImplementation(async () => Response.json({ tag_name: "unrecognized" }));
  await assert.rejects(checkCoreUpdate(Promise.resolve("0.4.1"), signal), /recognized stable release/);
});

test("an early update check waits for Python inspection before comparing versions", async (t) => {
  let finishInspection!: (version: string | null) => void;
  const installed = new Promise<string | null>((resolve) => {
    finishInspection = resolve;
  });
  const request = t.mock.method(globalThis, "fetch", async () => Response.json({ tag_name: "v0.4.2" }));
  const result = checkCoreUpdate(installed, new AbortController().signal);
  await Promise.resolve();
  assert.equal(request.mock.callCount(), 0);
  finishInspection("0.4.1");
  assert.match(await result, /Update available: 0.4.1 → 0.4.2/);
  assert.equal(request.mock.callCount(), 1);
});

test("canceling while Python inspection is pending prevents the release request", async (t) => {
  let finishInspection!: (version: string | null) => void;
  const installed = new Promise<string | null>((resolve) => {
    finishInspection = resolve;
  });
  const request = t.mock.method(globalThis, "fetch", async () => Response.json({ tag_name: "v0.4.2" }));
  const controller = new AbortController();
  const result = checkCoreUpdate(installed, controller.signal);
  controller.abort();
  finishInspection("0.4.1");
  await assert.rejects(result, { name: "AbortError" });
  assert.equal(request.mock.callCount(), 0);
});
