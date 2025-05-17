import { jwtDecode } from "jwt-decode";
import jwt from "jsonwebtoken";
import { describe, expect, test } from "@jest/globals";

const sampleToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
const sampleSecret = "your-256-bit-secret";

describe("JWT Parser", () => {
  test("should decode JWT token without verification", () => {
    const decoded = jwtDecode(sampleToken);
    expect(decoded).toHaveProperty("sub", "1234567890");
    expect(decoded).toHaveProperty("name", "John Doe");
    expect(decoded).toHaveProperty("iat", 1516239022);
  });

  test("should verify JWT token with correct secret", () => {
    const verified = jwt.verify(sampleToken, sampleSecret);
    expect(verified).toHaveProperty("sub", "1234567890");
    expect(verified).toHaveProperty("name", "John Doe");
    expect(verified).toHaveProperty("iat", 1516239022);
  });

  test("should throw error for invalid secret", () => {
    const wrongSecret = "wrong-secret";
    expect(() => jwt.verify(sampleToken, wrongSecret)).toThrow(jwt.JsonWebTokenError);
    expect(() => jwt.verify(sampleToken, wrongSecret)).toThrow("invalid signature");
  });

  test("should throw TokenExpiredError for expired token", () => {
    const expiredToken = jwt.sign({ data: "test" }, sampleSecret, { expiresIn: "0s" });
    expect(() => jwt.verify(expiredToken, sampleSecret)).toThrow(jwt.TokenExpiredError);
    expect(() => jwt.verify(expiredToken, sampleSecret)).toThrow(/expired/i);
  });

  test("should throw NotBeforeError for future token", () => {
    const futureToken = jwt.sign({ data: "test", nbf: Math.floor(Date.now() / 1000) + 3600 }, sampleSecret);
    expect(() => jwt.verify(futureToken, sampleSecret)).toThrow(jwt.NotBeforeError);
    expect(() => jwt.verify(futureToken, sampleSecret)).toThrow("jwt not active");
  });

  test("should throw error for completely invalid token format", () => {
    const invalidToken = "not-even-a-jwt";
    expect(() => jwtDecode(invalidToken)).toThrow("Invalid token specified");
  });

  test("should throw error for token with invalid number of segments", () => {
    const twoSegmentsOnly = "header.payload";
    const fourSegments = "header.payload.signature.extra";
    expect(() => jwtDecode(twoSegmentsOnly)).toThrow("Invalid token specified");
    expect(() => jwtDecode(fourSegments)).toThrow("Invalid token specified");
  });

  test("should throw error for token with invalid base64 encoding", () => {
    const invalidBase64 = "header.@#$%^&*.signature";
    expect(() => jwtDecode(invalidBase64)).toThrow("Invalid token specified");
  });

  test("should throw error for token with invalid JSON in payload", () => {
    // Create a token with invalid JSON in the payload segment
    const invalidJsonPayload =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.not-valid-json.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    expect(() => jwtDecode(invalidJsonPayload)).toThrow("Invalid token specified");
  });
});
