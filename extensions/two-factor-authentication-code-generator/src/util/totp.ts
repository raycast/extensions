import { createHmac } from "crypto";

import { decode } from "hi-base32";

/**
 * Performs the hash step of HOTP
 * @param key The secret key
 * @param count The count value
 */
function hash(key: Buffer, count: bigint): Buffer {
  const mac = createHmac("sha1", key);

  const data = Buffer.alloc(8);
  data.writeBigInt64BE(count);

  mac.update(data);

  return mac.digest();
}

function truncate(input: Buffer): number {
  const offset = input[input.length - 1] & 0xf;

  const p = input.slice(offset, offset + 4);

  return (p.readUInt32BE() & 0x7fffffff) % Math.pow(10, 6);
}

export function generateTOTP(key: string): number {
  const time = Math.floor(new Date().getTime() / 1000 / 30);

  const decodedKey = decode.asBytes(key.toUpperCase());

  const code = truncate(hash(Buffer.from(decodedKey), BigInt(time)));

  return code;
}
