import { md5 } from "../md5";

describe("md5", () => {
  it("should generate MD5 hash for simple text", () => {
    expect(md5.transform("hello")).toBe("5d41402abc4b2a76b9719d911017c592");
  });

  it("should generate MD5 hash for longer text", () => {
    expect(md5.transform("hello world")).toBe("5eb63bbbe01eeed093cb22bb8f5acdc3");
  });

  it("should generate different hashes for different text", () => {
    const hash1 = md5.transform("hello");
    const hash2 = md5.transform("world");
    expect(hash1).not.toBe(hash2);
  });

  it("should generate consistent hashes", () => {
    const hash1 = md5.transform("test");
    const hash2 = md5.transform("test");
    expect(hash1).toBe(hash2);
  });

  it("should handle empty string", () => {
    expect(md5.transform("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
  });

  it("should return 32 character hex string", () => {
    const hash = md5.transform("test");
    expect(hash).toHaveLength(32);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });
});
