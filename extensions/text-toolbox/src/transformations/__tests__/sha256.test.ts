import { sha256 } from "../sha256";

describe("sha256", () => {
  it("should generate SHA256 hash for simple text", () => {
    expect(sha256.transform("hello")).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  it("should generate SHA256 hash for longer text", () => {
    expect(sha256.transform("hello world")).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
  });

  it("should generate different hashes for different text", () => {
    const hash1 = sha256.transform("hello");
    const hash2 = sha256.transform("world");
    expect(hash1).not.toBe(hash2);
  });

  it("should generate consistent hashes", () => {
    const hash1 = sha256.transform("test");
    const hash2 = sha256.transform("test");
    expect(hash1).toBe(hash2);
  });

  it("should handle empty string", () => {
    expect(sha256.transform("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("should return 64 character hex string", () => {
    const hash = sha256.transform("test");
    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });
});
