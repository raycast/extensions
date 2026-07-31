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

test("omits pass row when first line is empty", () => {
  assert.deepEqual(
    parseVaultEntryRows(
      [
        "",
        "login: apps@rxtsel.dev",
        "url: https://example.invalid/security",
      ].join("\n"),
    ),
    [
      { idx: 1, name: "login", value: "apps@rxtsel.dev" },
      { idx: 2, name: "url", value: "https://example.invalid/security" },
    ],
  );
});

test("omits pass row for note-only entry (blank first line, then note text)", () => {
  assert.deepEqual(
    parseVaultEntryRows(
      ["", "my secret note line 1", "my secret note line 2"].join("\n"),
    ),
    [
      { idx: 1, name: "note", value: "my secret note line 1" },
      { idx: 2, name: "note", value: "my secret note line 2" },
    ],
  );
});

test("handles multiple blank lines between content", () => {
  assert.deepEqual(
    parseVaultEntryRows(
      ["mypass", "", "username: demo", "", "url: https://example.invalid"].join(
        "\n",
      ),
    ),
    [
      { idx: 0, name: "pass", value: "mypass" },
      { idx: 2, name: "username", value: "demo" },
      { idx: 4, name: "url", value: "https://example.invalid" },
    ],
  );
});
