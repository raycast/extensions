import { describe, expect, it } from "vitest";
import {
  claimsStatus,
  cleanToken,
  decodeToken,
  decryptToken,
  encryptToken,
  generateKey,
  looksLikeToken,
  signToken,
  verifyToken,
} from "../src/lib/tokens";

// The canonical jwt.io example token (HS256, secret "your-256-bit-secret").
const JWT_IO =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe("decode", () => {
  it("decodes a JWT", () => {
    const decoded = decodeToken(`Bearer ${JWT_IO}`);
    expect(decoded.kind).toBe("jws");
    if (decoded.kind !== "jws") return;
    expect(decoded.header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(decoded.claims).toEqual({ sub: "1234567890", name: "John Doe", iat: 1516239022 });
  });

  it("detects tokens", () => {
    expect(looksLikeToken(JWT_IO)).toBe(true);
    expect(looksLikeToken("hello.world.foo")).toBe(false);
    expect(cleanToken(` "${JWT_IO}"\n`)).toBe(JWT_IO);
  });

  it("rejects malformed tokens", () => {
    expect(() => decodeToken("abc")).toThrow(/parts/);
  });

  it("computes claim status", () => {
    const now = new Date(2_000_000_000_000);
    expect(claimsStatus({ exp: 1 }, now)).toBe("expired");
    expect(claimsStatus({ exp: 3_000_000_000 }, now)).toBe("valid");
    expect(claimsStatus({ nbf: 3_000_000_000 }, now)).toBe("not-yet-valid");
    expect(claimsStatus({}, now)).toBe("no-expiry");
  });
});

describe("verify", () => {
  it("verifies HS256 with the right secret", async () => {
    const result = await verifyToken(JWT_IO, "your-256-bit-secret", { encoding: "utf8", validateClaims: true });
    expect(result).toMatchObject({ signatureValid: true, claimsValid: true });
  });

  it("rejects the wrong secret", async () => {
    const result = await verifyToken(JWT_IO, "nope", { encoding: "utf8", validateClaims: false });
    expect(result.signatureValid).toBe(false);
  });

  it("reports expired claims separately from signature", async () => {
    const token = await signToken({
      alg: "HS256",
      header: { typ: "JWT" },
      payload: JSON.stringify({ exp: 1000 }),
      key: "secret",
      encoding: "utf8",
    });
    const result = await verifyToken(token, "secret", { encoding: "utf8", validateClaims: true });
    expect(result).toMatchObject({ signatureValid: true, claimsValid: false });
  });
});

describe("sign & verify round trips", () => {
  for (const alg of ["HS512", "RS256", "PS384", "ES256", "ES512", "EdDSA"]) {
    it(alg, async () => {
      const generated = generateKey(alg, "sign");
      const token = await signToken({
        alg,
        header: { typ: "JWT", kid: "k1" },
        payload: JSON.stringify({ sub: "abc" }),
        key: generated.key,
        encoding: generated.encoding,
      });
      const decoded = decodeToken(token);
      expect(decoded.header).toMatchObject({ alg, kid: "k1" });
      // Verify with the public key (asymmetric) or the same secret (HMAC).
      const verifyKey = generated.companion?.value ?? generated.key;
      const result = await verifyToken(token, verifyKey, { encoding: generated.encoding, validateClaims: true });
      expect(result.signatureValid).toBe(true);
      if (generated.companion) {
        // A private key also works for verification (public key is derived).
        expect(
          (await verifyToken(token, generated.key, { encoding: "utf8", validateClaims: false })).signatureValid,
        ).toBe(true);
      }
    });
  }

  it("verifies with a JWKS", async () => {
    const { createPublicKey } = await import("node:crypto");
    const generated = generateKey("ES256", "sign");
    const jwk = { ...createPublicKey(generated.companion!.value).export({ format: "jwk" }), kid: "k1" };
    const token = await signToken({
      alg: "ES256",
      header: { kid: "k1" },
      payload: "hi",
      key: generated.key,
      encoding: "utf8",
    });
    const result = await verifyToken(token, JSON.stringify({ keys: [jwk] }), {
      encoding: "utf8",
      validateClaims: false,
    });
    expect(result.signatureValid).toBe(true);
  });

  it("signs arbitrary JWS payloads", async () => {
    const token = await signToken({ alg: "HS256", header: {}, payload: "plain text", key: "s", encoding: "utf8" });
    const decoded = decodeToken(token);
    expect(decoded.kind === "jws" && decoded.payloadText).toBe("plain text");
  });
});

describe("encrypt & decrypt round trips", () => {
  const cases: [string, string][] = [
    ["dir", "A256GCM"],
    ["dir", "A128CBC-HS256"],
    ["A256KW", "A256GCM"],
    ["A128GCMKW", "A128GCM"],
    ["RSA-OAEP-256", "A256GCM"],
    ["ECDH-ES", "A256GCM"],
    ["ECDH-ES+A256KW", "A256CBC-HS512"],
    ["PBES2-HS256+A128KW", "A128GCM"],
  ];
  for (const [alg, enc] of cases) {
    it(`${alg} / ${enc}`, async () => {
      const generated = generateKey(alg, "encrypt", enc);
      const token = await encryptToken({
        alg,
        enc,
        header: { cty: "JWT" },
        plaintext: JWT_IO,
        key: generated.key,
        encoding: generated.encoding,
      });
      const decoded = decodeToken(token);
      expect(decoded).toMatchObject({ kind: "jwe", header: { alg, enc, cty: "JWT" } });
      const decryptKey = generated.companion?.value ?? generated.key;
      const result = await decryptToken(token, decryptKey, generated.encoding);
      expect(result.plaintext).toBe(JWT_IO);
      expect(result.nestedToken).toBe(JWT_IO);
    });
  }

  it("fails with the wrong key", async () => {
    const key = generateKey("dir", "encrypt", "A256GCM");
    const other = generateKey("dir", "encrypt", "A256GCM");
    const token = await encryptToken({
      alg: "dir",
      enc: "A256GCM",
      header: {},
      plaintext: "x",
      key: key.key,
      encoding: "base64url",
    });
    await expect(decryptToken(token, other.key, "base64url")).rejects.toThrow();
  });
});
