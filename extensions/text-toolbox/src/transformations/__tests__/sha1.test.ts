import { sha1 } from "../sha1";

describe("sha1", () => {
  it("should generate SHA1 hash for simple text", () => {
    expect(sha1.transform("hello")).toBe("aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d");
  });

  it("should generate SHA1 hash for longer text", () => {
    expect(sha1.transform("hello world")).toBe("2aae6c35c94fcfb415dbe95f408b9ce91ee846ed");
  });

  it("should generate different hashes for different text", () => {
    const hash1 = sha1.transform("hello");
    const hash2 = sha1.transform("world");
    expect(hash1).not.toBe(hash2);
  });

  it("should generate consistent hashes", () => {
    const hash1 = sha1.transform("test");
    const hash2 = sha1.transform("test");
    expect(hash1).toBe(hash2);
  });

  it("should handle empty string", () => {
    expect(sha1.transform("")).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
  });

  it("should return 40 character hex string", () => {
    const hash = sha1.transform("test");
    expect(hash).toHaveLength(40);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });
});
