import { createHmac } from "crypto";

import { decode } from "hi-base32";

const AllDigits = [6, 7, 8] as const;
export type Digits = typeof AllDigits[number];
const Algorithms = ["SHA1", "SHA256", "SHA512"] as const;
export type Algorithm = typeof Algorithms[number];

export interface Options {
  period: number;
  digits: Digits;
  algorithm: Algorithm;
}

export function isValidAlgorithm(alg: unknown): alg is Algorithm {
  return !!Algorithms.find((validAlg) => validAlg === alg);
}

export function isValidDigit(digit: unknown): digit is Digits {
  return !!AllDigits.find((validDigit) => validDigit == digit);
}

/**
 * Performs the hash step of HOTP
 * @param key The secret key
 * @param count The count value
 * @param algorithm The algorithm value
 */
function hash(key: Buffer, count: bigint, algorithm: string): Buffer {
  const mac = createHmac(algorithm, key);

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

export function generateTOTP(key: string, options: Options): number {
  const time = Math.floor(new Date().getTime() / 1000 / options.period);

  const decodedKey = decode.asBytes(key.toUpperCase());

  const code = truncate(hash(Buffer.from(decodedKey), BigInt(time), options.algorithm), options.digits);

  return code;
}
