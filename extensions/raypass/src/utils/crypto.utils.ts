import type { Record } from "../types";
import crypto from "node:crypto";

const algorithm = "aes-192-cbc";

const hash = (password: string) => crypto.scryptSync(password, "salt", 24);

const hmac = (data: string, password: string) => {
  const hmac = crypto.createHmac("sha256", hash(password));
  hmac.update(password);
  hmac.update(data);
  return hmac.digest("hex");
};

const encrypt = (data: string, password: string): string => {
  const key = hash(password);
  const iv = key.subarray(0, 16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = cipher.update(data, "utf8", "hex") + cipher.final("hex");
  return [encrypted, hmac(data, key.toString("hex"))].join(",");
};

const decrypt = ([encrypted, receivedHmac]: [string, string], password: string) => {
  const key = hash(password);
  const iv = key.subarray(0, 16);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  try {
    const decrypted = decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
    if (hmac(decrypted, key.toString("hex")) !== receivedHmac) return Error("Integrity compromised");
    return JSON.parse(decrypted) as Array<Record>;
  } catch (e) {
    // if data is tampered and block length is not valid then this will throw invalid password...
    return Error("Invalid Password");
  }
};

export const c = { encrypt, decrypt };
