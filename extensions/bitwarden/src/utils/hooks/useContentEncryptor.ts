import { getPreferenceValues } from "@raycast/api";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { useMemo } from "react";

const ALGORITHM = "aes-256-cbc";

export type EncryptedContent = { iv: string; content: string };

/** Encrypts and decrypts data using the user's client secret */
export function useContentEncryptor() {
  const { clientSecret } = getPreferenceValues<Preferences>();
  const cipherKeyBuffer = useMemo(() => get32BitSecretKeyBuffer(clientSecret.trim()), [clientSecret]);

  const encrypt = (data: string): EncryptedContent => {
    const ivBuffer = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, cipherKeyBuffer, ivBuffer);
    const encryptedContentBuffer = Buffer.concat([cipher.update(data), cipher.final()]);
    return { iv: ivBuffer.toString("hex"), content: encryptedContentBuffer.toString("hex") };
  };

  const decrypt = (content: string, iv: string): string => {
    const decipher = createDecipheriv(ALGORITHM, cipherKeyBuffer, Buffer.from(iv, "hex"));
    const decryptedContentBuffer = Buffer.concat([decipher.update(Buffer.from(content, "hex")), decipher.final()]);
    return decryptedContentBuffer.toString();
  };

  return { encrypt, decrypt };
}

function get32BitSecretKeyBuffer(key: string) {
  return Buffer.from(createHash("sha256").update(key).digest("base64").slice(0, 32));
}
