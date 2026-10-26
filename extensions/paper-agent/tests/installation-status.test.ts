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
  assert.match(await checkCoreUpdate("0.4.1", signal), /Update available/);
  fetchMock.mock.mockImplementation(async () => new Response("rate limited", { status: 403 }));
  await assert.rejects(checkCoreUpdate("0.4.1", signal), /HTTP 403/);
  fetchMock.mock.mockImplementation(async () => Response.json({ tag_name: "unrecognized" }));
  await assert.rejects(checkCoreUpdate("0.4.1", signal), /recognized stable release/);
});
