import { strict as assert } from "node:assert";
import test from "node:test";
import { parseGoogleMigrationUrl } from "./google-migration";

function varint(n: number): Buffer {
  const out: number[] = [];
  let value = n >>> 0;
  while (value >= 0x80) {
    out.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  out.push(value);
  return Buffer.from(out);
}

function fieldBytes(fieldNumber: number, value: Buffer): Buffer {
  const tag = (fieldNumber << 3) | 2;
  return Buffer.concat([varint(tag), varint(value.length), value]);
}

function fieldVarint(fieldNumber: number, value: number): Buffer {
  const tag = (fieldNumber << 3) | 0;
  return Buffer.concat([varint(tag), varint(value)]);
}

test("parseGoogleMigrationUrl parses TOTP accounts (SHA256)", () => {
  const otpParameters = Buffer.concat([
    fieldBytes(1, Buffer.from("12345678901234567890", "ascii")),
    fieldBytes(2, Buffer.from("user@example.com", "utf8")),
    fieldBytes(3, Buffer.from("GitHub", "utf8")),
    fieldVarint(4, 2),
    fieldVarint(5, 1),
    fieldVarint(6, 2),
  ]);

  const migrationPayload = Buffer.concat([fieldBytes(1, otpParameters)]);
  const url = `otpauth-migration://offline?data=${migrationPayload.toString("base64")}`;

  const accounts = parseGoogleMigrationUrl(url);
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].issuer, "GitHub");
  assert.equal(accounts[0].account, "user@example.com");
  assert.equal(accounts[0].digits, 6);
  assert.equal(accounts[0].algorithm, "SHA256");
  assert.equal(accounts[0].period, 30);
  assert.equal(accounts[0].secretBase32, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
});

test("parseGoogleMigrationUrl parses SHA1 entries", () => {
  const otpParameters = Buffer.concat([
    fieldBytes(1, Buffer.from("12345678901234567890", "ascii")),
    fieldBytes(2, Buffer.from("user@example.com", "utf8")),
    fieldBytes(3, Buffer.from("GitHub", "utf8")),
    fieldVarint(4, 1),
    fieldVarint(5, 1),
    fieldVarint(6, 2),
  ]);

  const migrationPayload = Buffer.concat([fieldBytes(1, otpParameters)]);
  const url = `otpauth-migration://offline?data=${migrationPayload.toString("base64")}`;

  const accounts = parseGoogleMigrationUrl(url);
  assert.equal(accounts[0].algorithm, "SHA1");
});

test("parseGoogleMigrationUrl defaults missing algorithm field to SHA1", () => {
  const otpParameters = Buffer.concat([
    fieldBytes(1, Buffer.from("12345678901234567890", "ascii")),
    fieldBytes(2, Buffer.from("user@example.com", "utf8")),
    fieldBytes(3, Buffer.from("GitHub", "utf8")),
    fieldVarint(5, 1),
    fieldVarint(6, 2),
  ]);

  const migrationPayload = Buffer.concat([fieldBytes(1, otpParameters)]);
  const url = `otpauth-migration://offline?data=${migrationPayload.toString("base64")}`;

  const accounts = parseGoogleMigrationUrl(url);
  assert.equal(accounts[0].algorithm, "SHA1");
});

test("parseGoogleMigrationUrl skips SHA384 entries (enum=3, unsupported)", () => {
  const otpParameters = Buffer.concat([
    fieldBytes(1, Buffer.from("12345678901234567890", "ascii")),
    fieldBytes(2, Buffer.from("user@example.com", "utf8")),
    fieldBytes(3, Buffer.from("GitHub", "utf8")),
    fieldVarint(4, 3),
    fieldVarint(5, 1),
    fieldVarint(6, 2),
  ]);

  const migrationPayload = Buffer.concat([fieldBytes(1, otpParameters)]);
  const url = `otpauth-migration://offline?data=${migrationPayload.toString("base64")}`;

  assert.throws(() => parseGoogleMigrationUrl(url), /No TOTP accounts/);
});

test("parseGoogleMigrationUrl keeps valid accounts when one has unsupported algorithm", () => {
  const goodEntry = Buffer.concat([
    fieldBytes(1, Buffer.from("12345678901234567890", "ascii")),
    fieldBytes(2, Buffer.from("ok@example.com", "utf8")),
    fieldBytes(3, Buffer.from("GitHub", "utf8")),
    fieldVarint(4, 1),
    fieldVarint(5, 1),
    fieldVarint(6, 2),
  ]);
  const badEntry = Buffer.concat([
    fieldBytes(1, Buffer.from("12345678901234567890", "ascii")),
    fieldBytes(2, Buffer.from("sha384@example.com", "utf8")),
    fieldBytes(3, Buffer.from("Other", "utf8")),
    fieldVarint(4, 3),
    fieldVarint(5, 1),
    fieldVarint(6, 2),
  ]);

  const migrationPayload = Buffer.concat([
    fieldBytes(1, goodEntry),
    fieldBytes(1, badEntry),
  ]);
  const url = `otpauth-migration://offline?data=${migrationPayload.toString("base64")}`;

  const accounts = parseGoogleMigrationUrl(url);
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].account, "ok@example.com");
  assert.equal(accounts[0].algorithm, "SHA1");
});

test("parseGoogleMigrationUrl skips HOTP entries (type=1)", () => {
  const otpParameters = Buffer.concat([
    fieldBytes(1, Buffer.from("12345678901234567890", "ascii")),
    fieldBytes(2, Buffer.from("user@example.com", "utf8")),
    fieldBytes(3, Buffer.from("GitHub", "utf8")),
    fieldVarint(4, 2),
    fieldVarint(5, 1),
    fieldVarint(6, 1),
  ]);

  const migrationPayload = Buffer.concat([fieldBytes(1, otpParameters)]);
  const url = `otpauth-migration://offline?data=${migrationPayload.toString("base64")}`;

  assert.throws(() => parseGoogleMigrationUrl(url), /No TOTP accounts/);
});

test("parseGoogleMigrationUrl rejects entries without secret", () => {
  const otpParameters = Buffer.concat([
    fieldBytes(2, Buffer.from("user@example.com", "utf8")),
    fieldBytes(3, Buffer.from("GitHub", "utf8")),
    fieldVarint(6, 2),
  ]);

  const migrationPayload = Buffer.concat([fieldBytes(1, otpParameters)]);
  const url = `otpauth-migration://offline?data=${migrationPayload.toString("base64")}`;

  assert.throws(() => parseGoogleMigrationUrl(url), /No TOTP accounts/);
});

test("parseGoogleMigrationUrl rejects wrong protocol", () => {
  assert.throws(
    () => parseGoogleMigrationUrl("https://example.com?data=AAAA"),
    /otpauth-migration/,
  );
});

test("parseGoogleMigrationUrl rejects missing data parameter", () => {
  assert.throws(
    () => parseGoogleMigrationUrl("otpauth-migration://offline"),
    /data/i,
  );
});

test("parseGoogleMigrationUrl rejects URLs longer than 64KB", () => {
  const huge = "otpauth-migration://offline?data=" + "A".repeat(70_000);
  assert.throws(() => parseGoogleMigrationUrl(huge), /too long/);
});
