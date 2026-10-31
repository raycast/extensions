// Copied from badge-count-raycast test/helper-output.test.ts on 2026-09-30, unchanged except this header and import paths
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { architectureFailure, interpretHelperRun } from "../../src/lib/badge/helper-output.ts";
import type { HelperRun } from "../../src/lib/badge/helper-output.ts";
import type { DockRead } from "../../src/lib/badge/badge.ts";

function makeRun(over: Partial<HelperRun> = {}): HelperRun {
  return {
    helperPath: "/x/dock-badges",
    exitCode: 0,
    signal: null,
    timedOut: false,
    spawnErrorCode: null,
    stdout: "",
    stderr: "",
    elapsedMs: 1,
    repairedMode: false,
    ...over,
  };
}

function expectFailure(read: DockRead, failure: string, reason?: string) {
  assert.equal(read.ok, false);
  if (read.ok) return;
  assert.equal(read.failure, failure);
  if (reason !== undefined) assert.equal(read.reason, reason);
}

describe("interpretHelperRun exit code mapping (F4)", () => {
  it("exit 10 is permission", () => {
    expectFailure(interpretHelperRun(makeRun({ exitCode: 10 })), "permission", "Accessibility access is off for Raycast");
  });

  it("exit 11 is dock-not-running", () => {
    expectFailure(interpretHelperRun(makeRun({ exitCode: 11 })), "dock-not-running", "Dock is not running");
  });

  it("exit 12 is dock-unrecognised", () => {
    expectFailure(interpretHelperRun(makeRun({ exitCode: 12 })), "dock-unrecognised", "Dock layout not recognised");
  });

  it("timeout is timeout", () => {
    expectFailure(
      interpretHelperRun(makeRun({ timedOut: true, exitCode: null, signal: "SIGKILL" })),
      "timeout",
      "Dock read timed out",
    );
  });

  it("exit 0 with invalid JSON is dock-unrecognised", () => {
    expectFailure(interpretHelperRun(makeRun({ stdout: "not json" })), "dock-unrecognised", "Dock layout not recognised");
  });

  it("exit 0 with no apps array is dock-unrecognised", () => {
    expectFailure(interpretHelperRun(makeRun({ stdout: '{"trusted":true}' })), "dock-unrecognised");
  });

  it("exit 0 with trusted false is dock-unrecognised", () => {
    expectFailure(interpretHelperRun(makeRun({ stdout: '{"trusted":false,"apps":[]}' })), "dock-unrecognised");
  });

  it("exit 0 with a string running field is dock-unrecognised", () => {
    const stdout = JSON.stringify({
      trusted: true,
      apps: [{ bundleId: "a", path: "/a", title: "A", running: "yes", badge: null }],
    });
    expectFailure(interpretHelperRun(makeRun({ stdout })), "dock-unrecognised");
  });

  it("unknown exit code 3 is helper-error", () => {
    expectFailure(interpretHelperRun(makeRun({ exitCode: 3 })), "helper-error");
  });

  it("spawn ENOENT is helper-missing", () => {
    expectFailure(
      interpretHelperRun(makeRun({ exitCode: null, spawnErrorCode: "ENOENT" })),
      "helper-missing",
      "Helper not found",
    );
  });

  it("spawn EACCES is helper-not-executable", () => {
    expectFailure(
      interpretHelperRun(makeRun({ exitCode: null, spawnErrorCode: "EACCES" })),
      "helper-not-executable",
    );
  });

  it("exit 0 with valid payload is ok", () => {
    const stdout = JSON.stringify({
      trusted: true,
      apps: [{ bundleId: "a", path: "/a", title: "A", running: true, badge: "7" }],
    });
    const read = interpretHelperRun(makeRun({ stdout }));
    assert.deepEqual(read, {
      ok: true,
      apps: [{ bundleId: "a", path: "/a", title: "A", running: true, badge: "7" }],
    });
  });
});

describe("failure diagnostics", () => {
  const cases: Array<[string, Partial<HelperRun>]> = [
    ["exit 10", { exitCode: 10 }],
    ["exit 11", { exitCode: 11 }],
    ["exit 12", { exitCode: 12 }],
    ["timeout", { timedOut: true, exitCode: null, signal: "SIGKILL" }],
    ["invalid JSON", { stdout: "not json" }],
    ["unknown exit", { exitCode: 3 }],
    ["ENOENT", { exitCode: null, spawnErrorCode: "ENOENT" }],
    ["EACCES", { exitCode: null, spawnErrorCode: "EACCES" }],
  ];
  for (const [name, over] of cases) {
    it(`${name} carries a diagnostic with exit code and helper path`, () => {
      const run = makeRun(over);
      const read = interpretHelperRun(run);
      assert.equal(read.ok, false);
      if (read.ok) return;
      assert.equal(typeof read.diagnostic, "string");
      assert.ok(read.diagnostic.includes(`exit: ${run.exitCode}`), read.diagnostic);
      assert.ok(read.diagnostic.includes("/x/dock-badges"), read.diagnostic);
    });
  }
});

describe("helper output schema against a sample capture in the helper's exact format (K6)", () => {
  const fixtureUrl = join(process.cwd(), "test/fixtures/helper-output-sample.json");
  const stdout = readFileSync(fixtureUrl, "utf8");

  it("is accepted with exit 0", () => {
    const read = interpretHelperRun(makeRun({ stdout }));
    assert.equal(read.ok, true);
  });

  it("gives every app the five contract fields with correct types", () => {
    const read = interpretHelperRun(makeRun({ stdout }));
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.ok(read.apps.length > 0);
    const nullableString = (v: unknown) => v === null || typeof v === "string";
    for (const app of read.apps) {
      assert.deepEqual(Object.keys(app).sort(), ["badge", "bundleId", "path", "running", "title"]);
      assert.ok(nullableString(app.bundleId), "bundleId");
      assert.ok(nullableString(app.path), "path");
      assert.ok(nullableString(app.title), "title");
      assert.equal(typeof app.running, "boolean");
      assert.ok(nullableString(app.badge), "badge");
    }
  });

  it("includes Mail with a string-or-null badge", () => {
    const read = interpretHelperRun(makeRun({ stdout }));
    assert.equal(read.ok, true);
    if (!read.ok) return;
    const mail = read.apps.find((a) => a.bundleId === "com.apple.mail");
    assert.ok(mail, "Mail present in capture");
    assert.ok(mail.badge === null || typeof mail.badge === "string");
  });
});

describe("architectureFailure (SPEC-STORE.md D2, T4)", () => {
  it("arm64 gives no failure", () => {
    assert.equal(architectureFailure("arm64"), undefined);
  });

  for (const arch of ["x64", "ia32"]) {
    it(`${arch} fails with a clear reason and the architecture in the diagnostic`, () => {
      const read = architectureFailure(arch);
      assert.ok(read);
      expectFailure(read, "unsupported-architecture", "Requires a Mac with Apple silicon");
      if (read.ok) return;
      assert.ok(read.diagnostic.includes(`arch: ${arch}`), read.diagnostic);
    });
  }
});
