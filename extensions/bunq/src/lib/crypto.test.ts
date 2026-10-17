import { describe, it, expect } from "vitest";
import {
  generateRsaKeyPair,
  signRequest,
  verifySignature,
  createRequestSignature,
  verifyResponseSignature,
  sha256Hash,
} from "./crypto";

describe("crypto", () => {
  describe("generateRsaKeyPair", () => {
    it("generates a valid RSA key pair", () => {
      const keyPair = generateRsaKeyPair();

      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.publicKey).toContain("-----BEGIN PUBLIC KEY-----");
      expect(keyPair.privateKey).toContain("-----BEGIN RSA PRIVATE KEY-----");
    });

    it("generates unique key pairs each time", () => {
      const keyPair1 = generateRsaKeyPair();
      const keyPair2 = generateRsaKeyPair();

      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
    });
  });

  describe("signRequest", () => {
    it("signs data with a private key", () => {
      const keyPair = generateRsaKeyPair();
      const data = "test data to sign";

      const signature = signRequest(keyPair.privateKey, data);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      // Base64 encoded signatures should only contain valid characters
      expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it("produces different signatures for different data", () => {
      const keyPair = generateRsaKeyPair();

      const sig1 = signRequest(keyPair.privateKey, "data 1");
      const sig2 = signRequest(keyPair.privateKey, "data 2");

      expect(sig1).not.toBe(sig2);
    });

    it("produces consistent signatures for the same data", () => {
      const keyPair = generateRsaKeyPair();
      const data = "consistent data";

      const sig1 = signRequest(keyPair.privateKey, data);
      const sig2 = signRequest(keyPair.privateKey, data);

      // Note: RSA signatures with PKCS#1 v1.5 padding are deterministic
      expect(sig1).toBe(sig2);
    });
  });

  describe("verifySignature", () => {
    it("verifies a valid signature", () => {
      const keyPair = generateRsaKeyPair();
      const data = "test data";
      const signature = signRequest(keyPair.privateKey, data);

      const isValid = verifySignature(keyPair.publicKey, data, signature);

      expect(isValid).toBe(true);
    });

    it("rejects an invalid signature", () => {
      const keyPair = generateRsaKeyPair();
      const data = "test data";
      const signature = signRequest(keyPair.privateKey, data);

      const isValid = verifySignature(keyPair.publicKey, "different data", signature);

      expect(isValid).toBe(false);
    });

    it("rejects a signature from a different key", () => {
      const keyPair1 = generateRsaKeyPair();
      const keyPair2 = generateRsaKeyPair();
      const data = "test data";
      const signature = signRequest(keyPair1.privateKey, data);

      const isValid = verifySignature(keyPair2.publicKey, data, signature);

      expect(isValid).toBe(false);
    });

    it("returns false for malformed signature", () => {
      const keyPair = generateRsaKeyPair();

      const isValid = verifySignature(keyPair.publicKey, "data", "not-a-valid-signature!");

      expect(isValid).toBe(false);
    });

    it("returns false for malformed public key", () => {
      const isValid = verifySignature("invalid-key", "data", "c2lnbmF0dXJl");

      expect(isValid).toBe(false);
    });
  });

  describe("createRequestSignature", () => {
    it("creates a signature for request body", () => {
      const keyPair = generateRsaKeyPair();
      const body = JSON.stringify({ amount: "10.00", currency: "EUR" });

      const signature = createRequestSignature(keyPair.privateKey, body);

      expect(signature).toBeDefined();
      expect(verifySignature(keyPair.publicKey, body, signature)).toBe(true);
    });

    it("handles empty body", () => {
      const keyPair = generateRsaKeyPair();

      const signature = createRequestSignature(keyPair.privateKey, "");

      expect(signature).toBeDefined();
      expect(verifySignature(keyPair.publicKey, "", signature)).toBe(true);
    });

    it("handles unicode characters in body", () => {
      const keyPair = generateRsaKeyPair();
      const body = JSON.stringify({ description: "Payment for café ☕" });

      const signature = createRequestSignature(keyPair.privateKey, body);

      expect(verifySignature(keyPair.publicKey, body, signature)).toBe(true);
    });
  });

  describe("verifyResponseSignature", () => {
    it("verifies a valid server response signature", () => {
      const keyPair = generateRsaKeyPair();
      const responseBody = JSON.stringify({ Response: [{ id: 123 }] });
      const signature = signRequest(keyPair.privateKey, responseBody);

      const isValid = verifyResponseSignature(keyPair.publicKey, responseBody, signature);

      expect(isValid).toBe(true);
    });

    it("rejects tampered response body", () => {
      const keyPair = generateRsaKeyPair();
      const originalBody = JSON.stringify({ Response: [{ id: 123 }] });
      const signature = signRequest(keyPair.privateKey, originalBody);
      const tamperedBody = JSON.stringify({ Response: [{ id: 456 }] });

      const isValid = verifyResponseSignature(keyPair.publicKey, tamperedBody, signature);

      expect(isValid).toBe(false);
    });
  });

  describe("sha256Hash", () => {
    it("produces a 64-character hex string", () => {
      const hash = sha256Hash("test input");

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces consistent output for same input", () => {
      const hash1 = sha256Hash("my-api-key");
      const hash2 = sha256Hash("my-api-key");

      expect(hash1).toBe(hash2);
    });

    it("produces different output for different input", () => {
      const hash1 = sha256Hash("key-one");
      const hash2 = sha256Hash("key-two");

      expect(hash1).not.toBe(hash2);
    });

    it("handles empty string", () => {
      const hash = sha256Hash("");

      // SHA-256 of empty string is a known constant
      expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });

    it("handles unicode characters", () => {
      const hash = sha256Hash("café ☕");

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
