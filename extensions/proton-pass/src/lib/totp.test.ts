import test from "node:test";
import assert from "node:assert/strict";
import { base32Decode, generateTotp, getTotpPeriod, parseOtpauthUri, TotpAlgorithm } from "./totp";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

// RFC 6238 appendix B test secrets and vectors (8 digits, 30 s period).
const RFC_SECRETS: Record<TotpAlgorithm, Buffer> = {
  sha1: Buffer.from("12345678901234567890"),
  sha256: Buffer.from("12345678901234567890123456789012"),
  sha512: Buffer.from("1234567890123456789012345678901234567890123456789012345678901234"),
};

const RFC_VECTORS: [number, Record<TotpAlgorithm, string>][] = [
  [59, { sha1: "94287082", sha256: "46119246", sha512: "90693936" }],
  [1111111109, { sha1: "07081804", sha256: "68084774", sha512: "25091201" }],
  [1111111111, { sha1: "14050471", sha256: "67062674", sha512: "99943326" }],
  [1234567890, { sha1: "89005924", sha256: "91819424", sha512: "93441116" }],
  [2000000000, { sha1: "69279037", sha256: "90698825", sha512: "38618901" }],
  [20000000000, { sha1: "65353130", sha256: "77737706", sha512: "47863826" }],
];

test("generates the RFC 6238 test vectors", () => {
  for (const [seconds, expected] of RFC_VECTORS) {
    for (const algorithm of Object.keys(RFC_SECRETS) as TotpAlgorithm[]) {
      const { code } = generateTotp(
        { secret: RFC_SECRETS[algorithm], algorithm, digits: 8, period: 30 },
        seconds * 1000,
      );
      assert.equal(code, expected[algorithm], `${algorithm} at ${seconds}s`);
    }
  }
});

test("truncates to 6 digits and reports the seconds left in the period", () => {
  const totp = generateTotp({ secret: RFC_SECRETS.sha1, algorithm: "sha1", digits: 6, period: 30 }, 59_000);
  assert.equal(totp.code, "287082");
  assert.equal(totp.remainingSeconds, 1);
  assert.equal(totp.period, 30);
});

test("decodes base32 regardless of case, spaces and padding", () => {
  assert.equal(base32Decode("MZXW6YTBOI======")?.toString(), "foobar");
  assert.equal(base32Decode("mzxw 6ytb oi")?.toString(), "foobar");
  assert.equal(base32Decode("MZXW6YTBO1"), undefined);
  assert.equal(base32Decode(""), undefined);
});

test("parses otpauth URIs with explicit parameters", () => {
  const secret = base32Encode(RFC_SECRETS.sha256);
  const params = parseOtpauthUri(
    `otpauth://totp/Example:alice@example.com?secret=${secret}&issuer=Example&algorithm=SHA256&digits=8&period=60`,
  );
  assert.ok(params);
  assert.equal(params.algorithm, "sha256");
  assert.equal(params.digits, 8);
  assert.equal(params.period, 60);
  assert.deepEqual(params.secret, RFC_SECRETS.sha256);
});

test("applies the defaults and accepts a bare base32 secret", () => {
  const secret = base32Encode(RFC_SECRETS.sha1);
  const fromUri = parseOtpauthUri(`otpauth://totp/Example?secret=${secret}`);
  assert.deepEqual(fromUri && { ...fromUri, secret: undefined }, {
    algorithm: "sha1",
    digits: 6,
    period: 30,
    secret: undefined,
  });

  const bare = parseOtpauthUri(secret.toLowerCase());
  assert.ok(bare);
  assert.equal(generateTotp(bare, 59_000).code, "287082");
});

test("rejects codes that can't be generated locally", () => {
  const secret = base32Encode(RFC_SECRETS.sha1);
  assert.equal(parseOtpauthUri(`otpauth://hotp/Example?secret=${secret}&counter=1`), undefined);
  assert.equal(parseOtpauthUri(`otpauth://totp/Steam?secret=${secret}&encoder=steam`), undefined);
  assert.equal(parseOtpauthUri(`otpauth://totp/Example?secret=${secret}&algorithm=MD5`), undefined);
  assert.equal(parseOtpauthUri(`otpauth://totp/Example?secret=${secret}&digits=10`), undefined);
  assert.equal(parseOtpauthUri(`otpauth://totp/Example?secret=${secret}&period=0`), undefined);
  assert.equal(parseOtpauthUri("otpauth://totp/Example?secret=not-base32!"), undefined);
  assert.equal(parseOtpauthUri("otpauth://totp/Example"), undefined);
});

test("knows the period of time-based codes only", () => {
  const secret = base32Encode(RFC_SECRETS.sha1);
  assert.equal(getTotpPeriod(`otpauth://totp/Steam?secret=${secret}&encoder=steam`), 30);
  assert.equal(getTotpPeriod(`otpauth://totp/Example?secret=${secret}&period=60`), 60);
  assert.equal(getTotpPeriod(secret), 30);
  assert.equal(getTotpPeriod(`otpauth://hotp/Example?secret=${secret}&counter=1`), undefined);
  assert.equal(getTotpPeriod("not a secret!"), undefined);
});
