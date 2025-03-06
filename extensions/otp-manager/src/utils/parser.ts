import { OTPConfig } from "../types";
import crypto from "crypto";
// Add these imports for Node.js
import { URL, URLSearchParams } from "url";

/**
 * Parses an OTP Auth URL into a configuration object
 */
export function parseOTPAuthURL(url: string): OTPConfig | null {
  try {
    const otpUrl = new URL(url);

    if (otpUrl.protocol !== "otpauth:" || otpUrl.host !== "totp") {
      throw new Error("Invalid URL: must start with 'otpauth://totp/'");
    }

    // Extract the service name from the path
    const name = decodeURIComponent(otpUrl.pathname.substring(1));

    // Extract parameters
    const params = new URLSearchParams(otpUrl.search);
    const secret = params.get("secret");

    if (!secret) {
      throw new Error("Invalid URL: missing 'secret' parameter");
    }

    // Extract other parameters with default values if they don't exist
    const algorithm = (params.get("algorithm") || "SHA1") as "SHA1" | "SHA256" | "SHA512";
    const digits = parseInt(params.get("digits") || "6", 10);
    const period = parseInt(params.get("period") || "30", 10);
    const issuer = params.get("issuer") || undefined;

    return {
      id: crypto.randomUUID(),
      name,
      issuer,
      secret,
      algorithm,
      digits,
      period,
    };
  } catch (error) {
    console.error("Error parsing OTP URL:", error);
    return null;
  }
}

/**
 * Parses an array of OTP Auth URLs from JSON
 */
export function parseOTPFromJSON(jsonContent: string): OTPConfig[] {
  try {
    const urls = JSON.parse(jsonContent) as string[];

    if (!Array.isArray(urls)) {
      throw new Error("JSON content must be an array of strings");
    }

    return urls.map(parseOTPAuthURL).filter((config): config is OTPConfig => config !== null);
  } catch (error) {
    console.error("Error parsing OTP JSON:", error);
    return [];
  }
}
