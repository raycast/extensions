import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OrcaCliError } from "../src/lib/orca-cli";
import { isOrcaDown, parseStatus } from "../src/lib/status";

describe("parseStatus", () => {
  test("parseStatus reads the captured running status", () => {
    const envelope = JSON.parse(readFileSync(join(__dirname, "fixtures", "status-running.json"), "utf8"));
    expect(parseStatus(envelope.result)).toEqual({ running: true });
  });

  test("parseStatus is not running when the app is down", () => {
    expect(parseStatus({ app: { running: false } })).toEqual({ running: false });
  });

  test("parseStatus is not running when the runtime is unreachable", () => {
    expect(parseStatus({ app: { running: true }, runtime: { reachable: false } })).toEqual({ running: false });
  });

  test("parseStatus is not running on unexpected shapes", () => {
    for (const value of [null, undefined, 42, "x", {}, { app: null }]) {
      expect(parseStatus(value)).toEqual({ running: false });
    }
  });
});

describe("isOrcaDown", () => {
  test("isOrcaDown is true when the status says not running", () => {
    expect(isOrcaDown({ running: false }, undefined)).toBe(true);
  });

  // `orca status` lève runtime_unavailable (« Orca is not running ») quand Orca a planté.
  test("isOrcaDown is true on the runtime_unavailable error", () => {
    expect(isOrcaDown(undefined, new OrcaCliError("runtime_unavailable", "Orca is not running."))).toBe(true);
  });

  test("isOrcaDown is false when running or on any other error", () => {
    expect(isOrcaDown({ running: true }, undefined)).toBe(false);
    expect(isOrcaDown(undefined, undefined)).toBe(false);
    expect(isOrcaDown(undefined, new OrcaCliError("binary_not_found", "x"))).toBe(false);
    expect(isOrcaDown(undefined, new Error("runtime_unavailable"))).toBe(false);
  });
});
