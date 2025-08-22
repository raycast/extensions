import { Buffer } from "buffer";
import base32Decode from "base32-decode";
import CryptoJS from "crypto-js";

// Steam alphabet for Steam Guard codes
const steamAlphabet = "23456789BCDFGHJKMNPQRTVWXY";

function hmac(algorithm: string, key: Buffer, message: Buffer) {
  const keyWordArray = CryptoJS.lib.WordArray.create(key);
  const msgWordArray = CryptoJS.lib.WordArray.create(message);

  let hash;
  switch (algorithm.toLowerCase()) {
    case "sha256":
      hash = CryptoJS.HmacSHA256(msgWordArray, keyWordArray);
      break;
    case "sha512":
      hash = CryptoJS.HmacSHA512(msgWordArray, keyWordArray);
      break;
    case "sha1":
    default:
      hash = CryptoJS.HmacSHA1(msgWordArray, keyWordArray);
      break;
  }
  return Buffer.from(hash.toString(CryptoJS.enc.Hex), "hex");
}

function generate(
  secret: string,
  counter: number,
  digits: number,
  algorithm: "sha1" | "sha256" | "sha512",
  type: "totp" | "hotp" | "steam",
): string {
  // Use a reliable base32 decoding library
  const key = Buffer.from(base32Decode(secret.replace(/\s/g, "").toUpperCase(), "RFC4648"));

  const counterBuffer = Buffer.alloc(8);
  // Write counter to buffer in big-endian format
  counterBuffer.writeBigUInt64BE(BigInt(counter), 0);

  const hash = hmac(algorithm, key, counterBuffer);
  const offset = hash[hash.length - 1] & 0xf;
  const binary = ((hash[offset] & 0x7f) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3];

  if (type === "steam") {
    let code = "";
    let tempBinary = binary;
    for (let i = 0; i < digits; i++) {
      code += steamAlphabet.charAt(tempBinary % steamAlphabet.length);
      tempBinary = Math.floor(tempBinary / steamAlphabet.length);
    }
    return code;
  } else {
    const otp = binary % Math.pow(10, digits);
    return otp.toString().padStart(digits, "0");
  }
}

export const generateTOTP = (
  secret: string,
  period = 30,
  digits = 6,
  algorithm: "sha1" | "sha256" | "sha512" = "sha1",
  type: "totp" | "steam" = "totp",
): string => {
  const now = Date.now();
  const counter = Math.floor(now / 1000 / period);
  return generate(secret, counter, digits, algorithm, type);
};

export const getRemainingSeconds = (period = 30): number => {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
};

export const getProgress = (period = 30): number => {
  return (getRemainingSeconds(period) / period) * 100;
};
