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
      expect(result.error).toBeDefined();
    });

    it("should return error when no secret provided", () => {
      const result = validateJWT(validToken);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("No secret provided");
    });
  });
});
