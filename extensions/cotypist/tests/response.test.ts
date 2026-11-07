import { describe, expect, it } from "vitest";
import { assertOperation, parseResponse } from "../src/lib/response";

const response = { ok: true, defaultEnabled: true, originalDefaultEnabled: false, changed: true, version: "2026.5", method: "native-accessibility", warnings: [] };
describe("Native state acknowledgement", () => {
  it("requires an explicit successful boolean state", () => { expect(parseResponse(JSON.stringify(response)).defaultEnabled).toBe(true); });
  it("preserves concrete Accessibility setup failures", () => { expect(() => parseResponse(JSON.stringify({ ok: false, error: "Allow Raycast in Accessibility" }))).toThrow("Allow Raycast"); });
  it.each(["", "not JSON", "null", "{}", JSON.stringify({ ...response, defaultEnabled: "on" }), JSON.stringify({ ...response, method: "shortcut-sent" })])("refuses unverified output: %s", (output) => { expect(() => parseResponse(output)).toThrow(); });
  it("rejects inconsistent before/after state", () => { expect(() => parseResponse(JSON.stringify({ ...response, originalDefaultEnabled: true }))).toThrow("inconsistent"); });
  it("does not report enable/disable success with the wrong acknowledged state", () => {
    const state = parseResponse(JSON.stringify(response));
    expect(() => assertOperation("enable-default", state)).not.toThrow();
    expect(() => assertOperation("disable-default", state)).toThrow("did not confirm");
  });
  it("requires a read-only status and a changed toggle result", () => {
    const changed = parseResponse(JSON.stringify(response));
    expect(() => assertOperation("status", changed)).toThrow("unexpectedly changed");
    const unchanged = parseResponse(JSON.stringify({ ...response, originalDefaultEnabled: true, changed: false }));
    expect(() => assertOperation("toggle-default", unchanged)).toThrow("did not confirm");
  });
  it.each([-1, 1.5, "half"]) ("rejects impossible model progress %s", (value) => { expect(() => parseResponse(JSON.stringify({ ...response, downloadProgress: value }))).toThrow("progress"); });
  it("retains restoration warnings instead of hiding them", () => { expect(parseResponse(JSON.stringify({ ...response, warnings: ["Previous pane was unavailable"] })).warnings).toEqual(["Previous pane was unavailable"]); });
});


it("preserves restoration warnings on native failure", () => {
  expect(() => parseResponse(JSON.stringify({ ok: false, error: "Native operation failed.", warnings: ["Prior pane could not be restored."] }))).toThrow("Prior pane could not be restored");
});
it("preserves separate operation and restoration diagnostic contexts", () => {
  const operation = "Operation failed: AX messaging failed [phase=general-pane-read; api=AXUIElementCopyAttributeValue; attribute=AXChildren]";
  const restoration = "Window/pane restoration failed: AX messaging failed [phase=window-restoration; api=AXUIElementCopyAttributeValue; attribute=AXRole]";
  let failure: unknown;
  try {
    parseResponse(JSON.stringify({ ok: false, error: operation, warnings: [restoration] }));
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).toBe(`${operation} ${restoration}`);
});
it("rejects premature disabled-state acknowledgement before the native confirmation", () => {
  const state = parseResponse(JSON.stringify({ ...response, originalDefaultEnabled: true, defaultEnabled: false, disableConfirmationHandled: false }));
  expect(() => assertOperation("disable-default", state)).toThrow("confirmation was not acknowledged");
  expect(() => assertOperation("toggle-default", state)).toThrow("confirmation was not acknowledged");
  expect(() => assertOperation("disable-default", { ...state, disableConfirmationHandled: true })).not.toThrow();
});
