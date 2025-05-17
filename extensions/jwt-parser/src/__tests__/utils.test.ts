import { isJWT, parseJWT, validateJWT } from "../utils";
import { sign } from "jsonwebtoken";

describe("JWT Utils", () => {
  const testPayload = { sub: "1234567890", name: "Test User", iat: 1516239022 };
  const testSecret = "test-secret";
  const validToken = sign(testPayload, testSecret);

  describe("isJWT", () => {
    it("should return true for valid JWT format", () => {
      expect(isJWT(validToken)).toBe(true);
    });

    it("should return false for invalid JWT format", () => {
      expect(isJWT("invalid-token")).toBe(false);
      expect(isJWT("header.payload")).toBe(false);
      expect(isJWT("")).toBe(false);
      expect(isJWT("header.payload.signature.extra")).toBe(false);
      expect(isJWT(null as unknown as string)).toBe(false);
      expect(isJWT(undefined as unknown as string)).toBe(false);
      expect(isJWT(123 as unknown as string)).toBe(false);
    });
  });

  describe("parseJWT", () => {
    it("should parse valid JWT token", () => {
      const result = parseJWT(validToken);
      expect(result.header).toBeDefined();
      expect(result.header.alg).toBe("HS256");
      expect(result.payload).toMatchObject(testPayload);
      expect(result.signature).toBeDefined();
    });

    it("should throw error for invalid JWT", () => {
      expect(() => parseJWT("invalid-token")).toThrow("Invalid JWT format");
    });

    it("should throw error for null or undefined input", () => {
      expect(() => parseJWT(null as unknown as string)).toThrow("Invalid JWT format");
      expect(() => parseJWT(undefined as unknown as string)).toThrow("Invalid JWT format");
    });

    it("should throw error for incorrect number of segments", () => {
      expect(() => parseJWT("header.payload")).toThrow("Invalid JWT format");
      expect(() => parseJWT("header.payload.signature.extra")).toThrow("Invalid JWT format");
    });

    it("should throw error for malformed tokens", () => {
      expect(() => parseJWT("header.@#$%^&*.signature")).toThrow("Invalid JWT format");
      expect(() => parseJWT("!@#$.payload.signature")).toThrow("Invalid JWT format");
      expect(() => parseJWT("not-json.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature")).toThrow("Invalid JWT format");
      expect(() => parseJWT("eyJhbGciOiJIUzI1NiJ9.not-json.signature")).toThrow("Invalid JWT format");
    });
  });

  describe("validateJWT", () => {
    it("should validate token with correct secret", () => {
      const result = validateJWT(validToken, testSecret);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should invalidate token with incorrect secret", () => {
      const result = validateJWT(validToken, "wrong-secret");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("invalid signature");
    });

    it("should return error when no secret provided", () => {
      const result = validateJWT(validToken);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("No secret provided");
    });

    it("should handle expired tokens", () => {
      const expiredToken = sign({ data: "test" }, testSecret, { expiresIn: "0s" });
      const result = validateJWT(expiredToken, testSecret);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("jwt expired");
    });

    it("should handle future tokens (NotBefore)", () => {
      const futureToken = sign({ data: "test", nbf: Math.floor(Date.now() / 1000) + 3600 }, testSecret);
      const result = validateJWT(futureToken, testSecret);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("jwt not active");
    });

    it("should handle malformed tokens", () => {
      const result = validateJWT("malformed.token.here", testSecret);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("invalid token");
    });

    it("should handle null or undefined inputs", () => {
      expect(validateJWT(null as unknown as string, testSecret)).toEqual({
        isValid: false,
        error: "jwt must be provided",
      });
      expect(validateJWT(undefined as unknown as string, testSecret)).toEqual({
        isValid: false,
        error: "jwt must be provided",
      });
    });
  });
});
