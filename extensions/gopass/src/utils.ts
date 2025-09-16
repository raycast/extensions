import { URL } from "url";
import * as OTPAuth from "otpauth";

export const capitalize = (string: string) => string[0].toUpperCase().concat(string.slice(1));

export const humanize = (string: string) => (string === "url" ? string.toUpperCase() : capitalize(string));

export const isDirectory = (string: string) => string.endsWith("/");

export const sortDirectoriesFirst = (array: string[]) =>
  array.sort((a, b) => (isDirectory(a) && !isDirectory(b) ? -1 : 0));

export const isValidUrl = (string: string) => {
  try {
    return /^http[s]?:/.test(new URL(string).protocol);
  } catch (err) {
    return false;
  }
};

export const isOtpauthUrl = (string: string) => string.startsWith("otpauth://");

export const generateOTPFromUrl = (otpauthUrl: string): string => {
  try {
    const totp = OTPAuth.URI.parse(otpauthUrl);
    return totp.generate();
  } catch (error) {
    throw new Error(`Failed to generate OTP from URL: ${error}`);
  }
};

export const extractOtpauthUrls = (details: string[]): string[] => {
  const otpauthUrls: string[] = [];

  details.forEach((line) => {
    // Check if line starts with otpauth:// (standalone format)
    if (isOtpauthUrl(line)) {
      otpauthUrls.push(line);
    } else if (line.includes(": ")) {
      // Check if line contains otpauth:// URL in key-value format
      const [, value] = line.split(": ");
      if (value && isOtpauthUrl(value)) {
        otpauthUrls.push(value);
      }
    }
  });

  return otpauthUrls;
};

export const getCurrentSeconds = (): number => {
  return Math.floor(Date.now() / 1000);
};

export const getOTPRemainingTime = (period = 30): number => {
  return period - (getCurrentSeconds() % period);
};

export const getOTPProgress = (period = 30): number => {
  const remaining = getOTPRemainingTime(period);
  return remaining / period; // Return remaining time ratio (100% -> 0%)
};

export const parseOtpauthUrl = (url: string): { period: number; algorithm: string; digits: number } => {
  try {
    const urlObj = new URL(url);
    const period = parseInt(urlObj.searchParams.get("period") || "30", 10);
    const algorithm = urlObj.searchParams.get("algorithm") || "SHA1";
    const digits = parseInt(urlObj.searchParams.get("digits") || "6", 10);
    return { period, algorithm, digits };
  } catch {
    return { period: 30, algorithm: "SHA1", digits: 6 };
  }
};
