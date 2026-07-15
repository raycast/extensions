import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { createCipheriv } from "node:crypto";
import { deriveKey, decryptBody, parseEnvelope } from "./offline";

// readlater-sync/CRYPTO.md asks every client to assert against this frozen
// vector — it's what keeps the browser extension, iOS and this extension
// byte-compatible. The vector uses a dummy token, so no real secret is needed.
//
// The Worker repo is a separate checkout, so skip rather than fail when it
// isn't present (e.g. on a machine that only has this extension).
const VECTOR_PATH = `${homedir()}/Developer/readlater-sync/test-vectors/offline-body.json`;

interface Vector {
  syncToken: string;
  ivHex: string;
  plaintextUtf8: string;
  expectedKeyHex: string;
  expectedWireBase64: string;
}

const describeVector = existsSync(VECTOR_PATH) ? describe : describe.skip;

describeVector("frozen interop vector (readlater-sync/CRYPTO.md)", () => {
  const v: Vector = JSON.parse(readFileSync(VECTOR_PATH, "utf8"));

  it("derives the same AES key as the other clients", () => {
    expect(deriveKey(v.syncToken).toString("hex")).toBe(v.expectedKeyHex);
  });

  it("decrypts the frozen wire bytes", () => {
    expect(decryptBody(v.expectedWireBase64, v.syncToken)).toBe(
      v.plaintextUtf8,
    );
  });

  // Proves our iv ‖ ct ‖ tag layout matches, not just that we can read our own
  // output — encrypting with the frozen iv must reproduce the exact wire.
  it("produces the frozen wire bytes when encrypting with the frozen iv", () => {
    const iv = Buffer.from(v.ivHex, "hex");
    const cipher = createCipheriv("aes-256-gcm", deriveKey(v.syncToken), iv);
    const ct = Buffer.concat([
      cipher.update(Buffer.from(v.plaintextUtf8, "utf8")),
      cipher.final(),
    ]);
    const wire = Buffer.concat([iv, ct, cipher.getAuthTag()]).toString(
      "base64",
    );
    expect(wire).toBe(v.expectedWireBase64);
  });

  it("rejects a wrong token rather than returning garbage", () => {
    expect(() =>
      decryptBody(v.expectedWireBase64, "the-wrong-token"),
    ).toThrow();
  });

  it("rejects a tampered blob", () => {
    const raw = Buffer.from(v.expectedWireBase64, "base64");
    raw[raw.length - 1] ^= 0xff; // flip a bit in the auth tag
    expect(() => decryptBody(raw.toString("base64"), v.syncToken)).toThrow();
  });
});

describe("decryptBody", () => {
  it("rejects a blob too short to hold an iv and tag", () => {
    expect(() => decryptBody(Buffer.alloc(8).toString("base64"), "t")).toThrow(
      "Offline copy is corrupt.",
    );
  });
});

// The plaintext is a JSON envelope, not bare HTML — CRYPTO.md's "Scheme"
// section is misleading on this point; offline.js:152 is the real contract.
describe("parseEnvelope", () => {
  it("reads the envelope the browser extension writes", () => {
    const env = parseEnvelope(
      JSON.stringify({
        v: 1,
        url: "https://example.com/a",
        title: "A Headline",
        siteName: "Example",
        excerpt: "A summary.",
        length: 4200,
        html: "<p>Body.</p>",
        capturedAt: 1234,
      }),
    );
    expect(env.title).toBe("A Headline");
    expect(env.html).toBe("<p>Body.</p>");
    expect(env.siteName).toBe("Example");
  });

  it("tolerates an envelope missing optional fields", () => {
    const env = parseEnvelope(JSON.stringify({ url: "u", html: "<p>x</p>" }));
    expect(env.title).toBe("");
    expect(env.excerpt).toBe("");
    expect(env.length).toBe(0);
  });
});
