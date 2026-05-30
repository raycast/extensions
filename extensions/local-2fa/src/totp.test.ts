import { strict as assert } from "node:assert";
import test from "node:test";
import { decodeBase32, generateTotpCode, parseOtpauthUrl } from "./totp";

test("decodeBase32 decodes valid secrets", () => {
  const decoded = decodeBase32("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  assert.equal(decoded.toString("ascii"), "12345678901234567890");
});

test("decodeBase32 fails on invalid characters", () => {
  assert.throws(() => decodeBase32("ABC!23"));
});

test("TOTP RFC 6238 - SHA1, 8 digits", () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(
    generateTotpCode({
      secretBase32: secret,
      digits: 8,
      algorithm: "SHA1",
      timestampMs: 59000,
    }),
    "94287082",
  );
  assert.equal(
    generateTotpCode({
      secretBase32: secret,
      digits: 8,
      algorithm: "SHA1",
      timestampMs: 1111111109000,
    }),
    "07081804",
  );
  assert.equal(
    generateTotpCode({
      secretBase32: secret,
      digits: 8,
      algorithm: "SHA1",
      timestampMs: 2000000000000,
    }),
    "69279037",
  );
});

test("parseOtpauthUrl parses issuer, account and parameters", () => {
  const parsed = parseOtpauthUrl(
    "otpauth://totp/GitHub:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&digits=6&period=30&algorithm=SHA1",
  );
  assert.equal(parsed.issuer, "GitHub");
  assert.equal(parsed.account, "user@example.com");
  assert.equal(parsed.digits, 6);
  assert.equal(parsed.period, 30);
  assert.equal(parsed.algorithm, "SHA1");
});

test("parseOtpauthUrl rejects non-otpauth protocols", () => {
  assert.throws(
    () => parseOtpauthUrl("https://example.com/totp?secret=JBSWY3DPEHPK3PXP"),
    /otpauth/,
  );
});

test("parseOtpauthUrl rejects hostnames other than totp", () => {
  assert.throws(
    () =>
      parseOtpauthUrl(
        "otpauth://hotp/GitHub:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub",
      ),
    /totp/,
  );
});

test("parseOtpauthUrl rejects invalid base32 secret", () => {
  assert.throws(() =>
    parseOtpauthUrl("otpauth://totp/GitHub:user@example.com?secret=!!!!!"),
  );
});

test("parseOtpauthUrl rejects label without issuer when issuer param is missing", () => {
  assert.throws(
    () => parseOtpauthUrl("otpauth://totp/justaccount?secret=JBSWY3DPEHPK3PXP"),
    /Missing issuer/,
  );
});

test("parseOtpauthUrl rejects invalid digits", () => {
  assert.throws(
    () =>
      parseOtpauthUrl(
        "otpauth://totp/GitHub:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&digits=7",
      ),
    /digits/i,
  );
});

test("parseOtpauthUrl rejects out-of-range period", () => {
  assert.throws(
    () =>
      parseOtpauthUrl(
        "otpauth://totp/GitHub:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&period=400",
      ),
    /period/i,
  );
});

test("parseOtpauthUrl rejects unsupported algorithm", () => {
  assert.throws(
    () =>
      parseOtpauthUrl(
        "otpauth://totp/GitHub:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=MD5",
      ),
    /algorithm/i,
  );
});

test("parseOtpauthUrl rejects issuer longer than 256 chars", () => {
  const longIssuer = "A".repeat(300);
  assert.throws(
    () =>
      parseOtpauthUrl(
        `otpauth://totp/${longIssuer}:user@example.com?secret=JBSWY3DPEHPK3PXP`,
      ),
    /Issuer exceeds/,
  );
});

test("decodeBase32 rejects input longer than 1024 chars", () => {
  assert.throws(() => decodeBase32("A".repeat(1025)), /too long/);
});
