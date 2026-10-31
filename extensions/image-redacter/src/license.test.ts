import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { issueLicenseKey, parseLicenseKey } from "./license";

function keyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKey: publicKey
      .export({ type: "spki", format: "der" })
      .toString("base64"),
    privateKey: privateKey
      .export({ type: "pkcs8", format: "der" })
      .toString("base64"),
  };
}

test("accepts a key signed by the matching private key", () => {
  const { publicKey, privateKey } = keyPair();
  const issuedAt = new Date("2026-09-17T10:00:00Z");
  const key = issueLicenseKey("buyer@example.com", privateKey, issuedAt);

  const license = parseLicenseKey(`  ${key}\n`, publicKey);
  assert.equal(license?.email, "buyer@example.com");
  assert.equal(license?.issuedAt, issuedAt.toISOString());
});

test("rejects keys with a tampered payload", () => {
  const { publicKey, privateKey } = keyPair();
  const key = issueLicenseKey("buyer@example.com", privateKey);
  const [payload, signature] = key.slice("CLOAK-".length).split(".");
  const forged = JSON.parse(Buffer.from(payload, "base64url").toString());
  forged.email = "someone-else@example.com";
  const forgedPayload = Buffer.from(JSON.stringify(forged)).toString(
    "base64url",
  );

  assert.equal(
    parseLicenseKey(`CLOAK-${forgedPayload}.${signature}`, publicKey),
    undefined,
  );
});

test("rejects keys signed by another private key", () => {
  const trusted = keyPair();
  const attacker = keyPair();
  const key = issueLicenseKey("buyer@example.com", attacker.privateKey);

  assert.equal(parseLicenseKey(key, trusted.publicKey), undefined);
});

test("rejects malformed keys", () => {
  const { publicKey } = keyPair();
  for (const key of ["", "CLOAK-", "CLOAK-abc", "KEY-abc.def", "CLOAK-a.b.c"]) {
    assert.equal(parseLicenseKey(key, publicKey), undefined);
  }
});
