import type { Record } from "../types";
import crypto from "node:crypto";
import fs from "node:fs";

const algorithm = "aes-256-ctr";

const hash = ({ password }: { password: string }) => {
  return crypto.createHash("sha256").update(password).digest("base64").substr(0, 32);
};

const encrypt = ({ text, password }: { text: string; password: string }) => {
  const key = hash({ password });
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const result = Buffer.concat([iv, cipher.update(text), cipher.final()]);
  return result.toString("hex");
};

const decrypt = ({ text, password }: { text: string; password: string }) => {
  const key = hash({ password });
  const [iv, encrypted] = [text.slice(0, 32), text.slice(32)];
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, "hex"));
  const data = Buffer.concat([decipher.update(Buffer.from(encrypted, "hex")), decipher.final()]);

  try {
    return JSON.parse(data.toString()) as Array<Record>;
  } catch (e) {
    throw new Error("Invalid password");
  }
};

// const fileIsEncrypted = ({ location }: { location: string }) => {
//   const data = fs.readFileSync(location, "utf-8");
//   try {
//     JSON.parse(data);
//     return false;
//   } catch (e) {
//     return true;
//   }
// };

export const c = {
  encrypt,
  decrypt,
  // fileIsEncrypted,
};
