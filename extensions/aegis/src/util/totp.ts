import { createHmac } from "crypto";
import { decode } from "hi-base32";

interface Options {
  period: number;
  digits: number;
  timestamp?: number;
}

export function generateTOTP(key: string, options: Options): string {
  let time = options.timestamp || new Date().getTime();
  time = Math.floor(time / 1000 / options.period);
  const decodedKey = decode.asBytes(key.toUpperCase());
  const token = truncate(
    hash(Buffer.from(decodedKey), BigInt(time)),
    options.digits
  );
  return token.toString().padStart(options.digits, "0");
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
