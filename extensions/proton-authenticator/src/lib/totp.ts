import { authenticator } from "otplib";
import { TOTPAccount } from "../types";

function normalizeAlgorithm(algo: string | undefined): string {
  if (!algo) return "sha1"; // default per RFC / common apps
  const lower = algo.toLowerCase();
  switch (lower) {
    case "sha1":
    case "sha256":
    case "sha512":
      return lower;
    default:
      console.warn(`Unsupported TOTP algorithm '${algo}', falling back to sha1`);
      return "sha1";
  }
}

export function generateTOTPWithOffset(account: TOTPAccount, offset = 0): string {
  try {
    const cleanSecret = account.secret.replace(/\s/g, "").toUpperCase();
    const digits = account.digits || 6;
    const step = account.period || 30;
    const algorithm = normalizeAlgorithm(account.algorithm);

    const opts: Partial<typeof authenticator.options> & {
      algorithm: typeof authenticator.options.algorithm;
      epoch?: number;
    } = {
      digits,
      step,
      algorithm: algorithm as typeof authenticator.options.algorithm,
    };

    if (offset !== 0) {
      const delta = step * 1000; // ms
      opts.epoch = Date.now() + offset * delta;
    }

    authenticator.options = opts;
    const token = authenticator.generate(cleanSecret);
    authenticator.resetOptions();
    return token;
  } catch (error) {
    console.error("Failed to generate TOTP with offset:", error);
    return "Error";
  }
}

export function generateTOTP(account: TOTPAccount): string {
  return generateTOTPWithOffset(account, 0);
}

export function generateNextTOTP(account: TOTPAccount): string {
  return generateTOTPWithOffset(account, 1);
}

export function getTimeRemaining(period: number = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period);
}
