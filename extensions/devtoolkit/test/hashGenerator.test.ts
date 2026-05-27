import assert from "node:assert/strict";
import test from "node:test";

import { generateHashes } from "../src/hashGenerator";

test("generates common hashes for UTF-8 text", () => {
  assert.deepEqual(generateHashes("hello"), [
    {
      algorithm: "MD5",
      value: "5d41402abc4b2a76b9719d911017c592",
    },
    {
      algorithm: "SHA-1",
      value: "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d",
    },
    {
      algorithm: "SHA-256",
      value: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    },
    {
      algorithm: "SHA-384",
      value:
        "59e1748777448c69de6b800d7a33bbfb9ff1b463e44354c3553bcdb9c666fa90125a3c79f90397bdf5f6a13de828684f",
    },
    {
      algorithm: "SHA-512",
      value:
        "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043",
    },
  ]);
});
