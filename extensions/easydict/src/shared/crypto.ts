/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import crypto, { createHash } from "node:crypto";

import { environment } from "@raycast/api";

export function md5(text: string): string {
  return createHash("md5").update(text).digest("hex");
}

function deriveKey(password: string) {
  return crypto.createHash("sha256").update(password).digest();
}

export function myEncrypt(text: string) {
  const key = deriveKey(environment.extensionName);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);

  return Buffer.concat([iv, encrypted]).toString("base64");
}

export function myDecrypt(ciphertext: string) {
  const raw = Buffer.from(ciphertext, "base64");

  const iv = raw.subarray(0, 16);
  const encrypted = raw.subarray(16);

  const key = deriveKey(environment.extensionName);

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString("utf8");
}
