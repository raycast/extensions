import { decodeJwtClaims } from "./jwt";

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

describe("Clerk JWT claims", () => {
  it("reads the signed subject and issuer payload used for profile setup", () => {
    const token = `${encode({ alg: "RS256" })}.${encode({
      sub: "user_123",
      iss: "https://clerk.hotkys.com",
      email: "user@example.com",
    })}.signature`;

    expect(decodeJwtClaims(token)).toEqual({
      sub: "user_123",
      iss: "https://clerk.hotkys.com",
      email: "user@example.com",
    });
  });

  it.each([
    "not-a-jwt",
    `${encode({})}.${encode({ iss: "https://clerk.hotkys.com" })}.signature`,
    `${encode({})}.${encode({
      sub: "user_123",
      iss: "https://other.example.com",
    })}.signature`,
  ])("rejects an invalid Hotkys token payload", (token) => {
    expect(() => decodeJwtClaims(token)).toThrow("Invalid Hotkys access token");
  });
});
