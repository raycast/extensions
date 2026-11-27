import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatErrorHud } from "../src/errorSummary.ts";

describe("formatErrorHud", () => {
  test("shows the reason for a cancelled UAC prompt in full", () => {
    const error = Object.assign(new Error("Command failed with exit code 1: powershell.exe"), {
      stdout: "",
      stderr: "The operation was canceled by the user\r\n",
    });

    assert.equal(formatErrorHud(error), "⚠️ The operation was canceled by the user");
  });

  test("uses the last line of stdout when stderr is empty", () => {
    const error = Object.assign(new Error("Command failed: ipconfig.exe /flushdns"), {
      stdout: "\r\nWindows IP Configuration\r\n\r\nCould not flush the DNS Resolver Cache: Function failed during execution.\r\n",
      stderr: "",
    });

    const hud = formatErrorHud(error);
    assert.ok(hud.startsWith("⚠️ Could not flush the DNS Resolver Cache: Function failed"), hud);
    assert.ok(hud.endsWith("…"), hud);
  });

  test("uses the error message when there is no command output", () => {
    assert.equal(
      formatErrorHud(new Error("ipconfig /flushdns failed as administrator (exit code 1)")),
      "⚠️ ipconfig /flushdns failed as administrator (exit code 1)",
    );
  });

  test("falls back to a generic message for unknown errors", () => {
    assert.equal(formatErrorHud(undefined), "⚠️ Error flushing DNS cache");
  });

  test("never exceeds 64 characters", () => {
    assert.equal(formatErrorHud(new Error("x".repeat(200))).length, 64);
  });
});
