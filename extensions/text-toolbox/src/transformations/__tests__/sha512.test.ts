import { sha512 } from "../sha512";

describe("sha512", () => {
  it("should generate SHA512 hash for simple text", () => {
    expect(sha512.transform("hello")).toBe(
      "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043",
    );
  });

  it("should generate different hashes for different text", () => {
    const hash1 = sha512.transform("hello");
    const hash2 = sha512.transform("world");
    expect(hash1).not.toBe(hash2);
  });

  it("should generate consistent hashes", () => {
    const hash1 = sha512.transform("test");
    const hash2 = sha512.transform("test");
    expect(hash1).toBe(hash2);
  });

  it("should handle empty string", () => {
    expect(sha512.transform("")).toBe(
      "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
    );
  });

  it("should return 128 character hex string", () => {
    const hash = sha512.transform("test");
    expect(hash).toHaveLength(128);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });
});
