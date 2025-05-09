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

  test("should throw error for invalid token", () => {
    const invalidToken = "invalid.token.here";
    expect(() => jwtDecode(invalidToken)).toThrow();
  });

  test("should throw error for invalid secret", () => {
    const wrongSecret = "wrong-secret";
    expect(() => jwt.verify(sampleToken, wrongSecret)).toThrow(jwt.JsonWebTokenError);
  });
});
