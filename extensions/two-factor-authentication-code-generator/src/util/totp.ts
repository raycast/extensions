import { createHmac } from "crypto";

import { decode } from "hi-base32";

const AllDigits = [6, 7, 8] as const;
export type Digits = (typeof AllDigits)[number];
const Algorithms = ["SHA1", "SHA256", "SHA512"] as const;
export type Algorithm = (typeof Algorithms)[number];
export const DEFAULT_OPTIONS: Options = {
  digits: 6,
  algorithm: "SHA1",
  period: 30,
};
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

export function parse(value: string): { secret: string; options: Options; lastTimeUsed?: number } {
  try {
    return JSON.parse(value);
  } catch {
    return { secret: value, options: DEFAULT_OPTIONS, lastTimeUsed: new Date().getTime() };
  }
}

type ParseOtpUrlResult =
  | { success: true; data: { name: string; data: { secret: string; options: Options } } }
  | { success: false; data: string };

export function parseOtpUrl(url: string): ParseOtpUrlResult {
  try {
    const parse = new URL(url);
    if (parse.protocol !== "otpauth:") {
      return { success: false, data: "Unsupported protocol " + parse.protocol };
    }
    if (parse.host !== "totp") {
      return { success: false, data: "Unsupported type " + parse.host + " only TOTP supported" };
    }
    if (!parse.pathname) {
      return { success: false, data: "Label is missing" };
    }

    const name = decodeURIComponent(parse.pathname.slice(1));
    const searchParams = parse.searchParams;
    const secret = searchParams.get("secret");
    const algorithm = searchParams.get("algorithm") ? searchParams.get("algorithm") : DEFAULT_OPTIONS.algorithm;
    const maybePeriod = searchParams.get("period");
    const period = maybePeriod ? parseInt(maybePeriod) : DEFAULT_OPTIONS.period;
    const digits = searchParams.get("digits") ? searchParams.get("digits") : DEFAULT_OPTIONS.digits;

    if (!secret) {
      return { success: false, data: "Secret is mandatory" };
    }

    try {
      decode.asBytes(secret);
    } catch {
      return { success: false, data: "Invalid 2FA secret" };
    }

    if (!isValidAlgorithm(algorithm)) {
      return { success: false, data: "Unsupported hashing algorithm " + algorithm };
    }

    if (isNaN(period) || period <= 0) {
      return { success: false, data: "Period should be a positive number" };
    }

    if (!isValidDigit(digits)) {
      return { success: false, data: "Unsupported digits " + digits };
    }

    const options: Options = { digits, period, algorithm };
    return { success: true, data: { name, data: { secret, options } } };
  } catch {
    return { success: false, data: "Unable to parse URL" };
  }
}

export function generateOtpUrl(name: string, secret: string, options: Options): string {
  const url = new URL(`otpauth://totp/${encodeURIComponent(name)}`);
  url.searchParams.set("secret", secret);
  url.searchParams.set("algorithm", options.algorithm);
  url.searchParams.set("period", options.period.toString());
  url.searchParams.set("digits", options.digits.toString());
  return url.toString();
}
