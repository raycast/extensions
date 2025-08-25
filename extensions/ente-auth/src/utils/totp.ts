import { Buffer } from "buffer";
import base32Decode from "base32-decode";
import CryptoJS from "crypto-js";
import { validateBase32Secret } from "./validation";
import { logSecureError, sanitizeErrorMessage } from "./errorHandling";

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

// SECURITY FIX: Result interface for secure TOTP generation
export interface TOTPResult {
  success: boolean;
  code?: string;
  error?: string;
}

function generate(
  secret: string,
  counter: number,
  digits: number,
  algorithm: "sha1" | "sha256" | "sha512",
  type: "totp" | "hotp" | "steam",
): string {
  // SECURITY FIX: Add try-catch error handling around base32Decode
  let key: Buffer;
  try {
    const cleanSecret = secret.replace(/\s/g, "").toUpperCase();
    const decodedBytes = base32Decode(cleanSecret, "RFC4648");
    key = Buffer.from(decodedBytes);
  } catch (error) {
    logSecureError(error, "TOTP base32 decode");
    throw new Error("Invalid authenticator secret format");
  }

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
  // SECURITY FIX: Validate secret before processing
  const validation = validateBase32Secret(secret);
  if (!validation.isValid) {
    logSecureError(new Error(validation.error || "Invalid base32 secret"), "generateTOTP");
    throw new Error("Invalid authenticator secret format");
  }

  try {
    const now = Date.now();
    const counter = Math.floor(now / 1000 / period);
    return generate(secret, counter, digits, algorithm, type);
  } catch (error) {
    logSecureError(error, "generateTOTP");
    throw new Error("Failed to generate TOTP code");
  }
};

/**
 * SECURITY FIX: Secure TOTP generation with comprehensive error handling
 * Returns error codes instead of throwing exceptions
 */
export const generateSecureTOTP = (
  secret: string,
  period = 30,
  digits = 6,
  algorithm: "sha1" | "sha256" | "sha512" = "sha1",
  type: "totp" | "steam" = "totp",
): TOTPResult => {
  // Validate secret before processing
  const validation = validateBase32Secret(secret);
  if (!validation.isValid) {
    logSecureError(new Error(validation.error || "Invalid base32 secret"), "generateSecureTOTP");
    return {
      success: false,
      error: sanitizeErrorMessage(validation.error || "Invalid authenticator secret format"),
    };
  }

  try {
    const now = Date.now();
    const counter = Math.floor(now / 1000 / period);
    const code = generate(secret, counter, digits, algorithm, type);

    return {
      success: true,
      code,
    };
  } catch (error) {
    logSecureError(error, "generateSecureTOTP");
    return {
      success: false,
      error: sanitizeErrorMessage(error),
    };
  }
};

export const getRemainingSeconds = (period = 30): number => {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
};

export const getProgress = (period = 30): number => {
  return (getRemainingSeconds(period) / period) * 100;
};
