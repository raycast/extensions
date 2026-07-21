import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

export type Encrypted = { v: 1; iv: string; tag: string; data: string };

export function encrypt(plaintext: Buffer, key: Buffer): Encrypted {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: data.toString("base64"),
  };
}

export function decrypt(enc: Encrypted, key: Buffer): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(enc.iv, "base64"));
  decipher.setAuthTag(Buffer.from(enc.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(enc.data, "base64")), decipher.final()]);
}
