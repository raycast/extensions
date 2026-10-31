import { describe as suite, expect, it } from "vitest";
import { connection } from "./connection";

suite("connection", () => {
  it("warns that the shown data may be stale while it is still reading the mount", () => {
    expect(connection({ isLoading: true })).toEqual({ state: "connecting", title: "Connecting…" });
  });

  it("confirms the shown data is real once the mount answered", () => {
    expect(connection({ isLoading: false })).toEqual({ state: "connected", title: "Connected" });
  });

  it("explains why it failed, so the user knows whether to close the phone app or turn on Bluetooth", () => {
    expect(connection({ isLoading: false, error: new Error("Bluetooth is turned off.") })).toEqual({
      state: "failed",
      title: "Not Connected",
      message: "Bluetooth is turned off.",
    });
  });

  it("shows a retry as connecting instead of keeping the previous failure", () => {
    expect(connection({ isLoading: true, error: new Error("Bluetooth is turned off.") })).toEqual({
      state: "connecting",
      title: "Connecting…",
    });
  });
});
