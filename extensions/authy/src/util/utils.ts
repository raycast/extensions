import { encode } from "hi-base32";
import forge from "node-forge";
import { generateTOTP } from "./totp";

export function genTOTP(seed: string): string[] {
  const secret = encode(Buffer.from(seed, "hex"));
  const timestamp = new Date();
  return [
    generateTOTP(secret, { digits: 7, period: 10, timestamp: timestamp.getTime() }),
    generateTOTP(secret, { digits: 7, period: 10, timestamp: timestamp.getTime() + 10 * 1000 }),
    generateTOTP(secret, { digits: 7, period: 10, timestamp: timestamp.getTime() + 10 * 2 * 1000 }),
  ];
}

export function decryptSeed(encryptedSeed: string, salt: string, password: string) {
  let decrypted = decryptAES(salt, password, encryptedSeed, false);
  if (decrypted === null || !isBase32(decrypted)) {
    decrypted = decryptAES(salt, password, encryptedSeed, true);
    if (decrypted === null || !isBase32(decrypted)) {
      throw new Error("Couldn't decrypt service tokens. Seems like Backup Password is wrong");
    }
  }
  return decrypted;
}

function isBase32(value: string): boolean {
  return value.replace(/-|\s/g, "").match(/^[a-zA-Z2-7]+=*$/) !== null;
}

interface GeneratePBKDF2KeyOptions {
  iterations: number;
  keySize: number;
  decodeSalt: boolean;
  withoutEncoding: boolean;
}

function generatePBKDF2Key(password: string, salt: string, options: GeneratePBKDF2KeyOptions) {
  if (options.decodeSalt) {
    salt = forge.util.hexToBytes(salt);
  }

  if (options.withoutEncoding) {
    return forge.pkcs5.pbkdf2(password, salt, options.iterations, options.keySize);
  }

  return forge.pkcs5.pbkdf2(unescape(encodeURIComponent(password)), salt, options.iterations, options.keySize);
}

function decryptAESWithKey(key: string, value: string) {
  const ivBuffer = forge.util.createBuffer(
    forge.util.decodeUtf8("\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00")
  );
  const keyBuffer = forge.util.createBuffer(key);
  const valueBuffer = forge.util.createBuffer(forge.util.decode64(value));

  const decipher = forge.cipher.createDecipher("AES-CBC", keyBuffer);
  decipher.start({ iv: ivBuffer });
  decipher.update(valueBuffer);
  return decipher.finish() ? decipher.output.data : null;
}

function decryptAES(salt: string, password: string, value: string, withoutEncoding: boolean) {
  const pbkdf2Key = generatePBKDF2Key(password, salt, {
    iterations: 1000,
    keySize: 32, // Originally it was denoted in bits, changed to bytes
    decodeSalt: false,
    withoutEncoding,
  });

  return decryptAESWithKey(pbkdf2Key, value);
}
