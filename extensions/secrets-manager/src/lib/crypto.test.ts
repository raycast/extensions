import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { encrypt, decrypt } from "./crypto";

const key = randomBytes(32);

describe("crypto", () => {
  it("round-trips plaintext", () => {
    const pt = Buffer.from("hunter2 🔐", "utf8");
    const back = decrypt(encrypt(pt, key), key);
    expect(back.toString("utf8")).toBe("hunter2 🔐");
  });

  it("uses a fresh iv per call", () => {
    const pt = Buffer.from("same", "utf8");
    expect(encrypt(pt, key).iv).not.toBe(encrypt(pt, key).iv);
  });

  it("throws when the auth tag is tampered", () => {
    const enc = encrypt(Buffer.from("data"), key);
    const bad = Buffer.from(enc.tag, "base64");
    bad[0] ^= 0xff;
    expect(() => decrypt({ ...enc, tag: bad.toString("base64") }, key)).toThrow();
  });

  it("throws with the wrong key", () => {
    const enc = encrypt(Buffer.from("data"), key);
    expect(() => decrypt(enc, randomBytes(32))).toThrow();
  });
});
