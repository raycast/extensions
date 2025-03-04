import { createHmac } from "crypto";
import { decode } from "hi-base32";
import forge from "node-forge";

interface Options {
  period: number;
  digits: number;
  timestamp?: number;
}

export function generateTOTP(key: string, options: Options): string {
  let time = options.timestamp || new Date().getTime();
  time = Math.floor(time / 1000 / options.period);
  const decodedKey = decode.asBytes(key.toUpperCase());
  const token = truncate(hash(Buffer.from(decodedKey), BigInt(time)), options.digits);
  return token.toString().padStart(options.digits, "0");
}

export function decryptSeed(encryptedSeed: string, salt: string, password: string, iterations: number) {
  let decrypted = decryptAES(salt, password, encryptedSeed, false, iterations);
  if (decrypted === null || !isBase32(decrypted)) {
    decrypted = decryptAES(salt, password, encryptedSeed, true, iterations);
  }
  return decrypted !== null && isBase32(decrypted) ? decrypted : null;
}

function hash(key: Buffer, count: bigint): Buffer {
  const mac = createHmac("sha1", key);
  const data = Buffer.alloc(8);
  data.writeBigInt64BE(count);
  mac.update(data);
  return mac.digest();
}

function truncate(input: Buffer, digits: number): number {
  const offset = input[input.length - 1] & 0xf;
  const p = input.slice(offset, offset + 4);
  return (p.readUInt32BE() & 0x7fffffff) % Math.pow(10, digits);
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

function decryptAES(salt: string, password: string, value: string, withoutEncoding: boolean, iterations: number) {
  const pbkdf2Key = generatePBKDF2Key(password, salt, {
    iterations,
    keySize: 32, // Originally it was denoted in bits, changed to bytes
    decodeSalt: false,
    withoutEncoding,
  });

  return decryptAESWithKey(pbkdf2Key, value);
}
