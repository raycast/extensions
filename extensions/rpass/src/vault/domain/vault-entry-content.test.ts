import assert from "node:assert/strict";
import test from "node:test";
import { parseVaultEntryRows } from "./vault-entry-content";

test("parses password, fields, OTP URIs, and extra lines", () => {
  assert.deepEqual(
    parseVaultEntryRows(
      [
        "dummy-password",
        "username: demo",
        "url: https://example.invalid/login",
        "otpauth://totp/example.invalid?secret=dummy",
        "recovery note",
      ].join("\n"),
    ),
    [
      { idx: 0, name: "pass", value: "dummy-password" },
      { idx: 1, name: "username", value: "demo" },
      { idx: 2, name: "url", value: "https://example.invalid/login" },
      {
        idx: 3,
        name: "otpauth",
        value: "otpauth://totp/example.invalid?secret=dummy",
      },
      { idx: 4, name: "note", value: "recovery note" },
    ],
  );
});
