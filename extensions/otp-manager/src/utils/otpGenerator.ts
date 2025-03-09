import * as crypto from "crypto";
import { OTPConfig } from "../types";
import * as base32 from "thirty-two";

/**
 * Generates an OTP code based on a configuration
 */
export function generateOTP(config: OTPConfig): string {
  const { secret, algorithm, digits, period } = config;

  // Decode the secret in base32
  const secretBuffer = base32ToBuffer(secret);

  // Calculate the counter based on current time
  const counter = Math.floor(Date.now() / 1000 / period);

  // Create an 8-byte buffer for the counter
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter), 0);

  // Calculate the HMAC
  const hmac = crypto.createHmac(algorithm, secretBuffer);
  hmac.update(counterBuffer);
  const hmacResult = hmac.digest();

  // Calculate the OTP code
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const binary =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);

  // Format the OTP with leading zeros if necessary
  return otp.toString().padStart(digits, "0");
}

/**
 * Converts a base32 string to a Buffer
 */
function base32ToBuffer(base32String: string): Buffer {
  // Clean the input string by removing spaces and making it uppercase
  const cleanedInput = base32String.replace(/\s+/g, "").toUpperCase();

  // Use the thirty-two library to decode the base32 string
  return base32.decode(cleanedInput);
}

/**
 * Calculates the remaining time in seconds until the OTP code changes
 */
export function getRemainingSeconds(period: number): number {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
}
