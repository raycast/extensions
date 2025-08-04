import { authenticator } from "otplib";
import { TOTPAccount } from "../types";

export function generateTOTPWithOffset(account: TOTPAccount, offset = 0): string {
  try {
    const cleanSecret = account.secret.replace(/\s/g, "").toUpperCase();

    if (offset === 0) {
      authenticator.options = {
        digits: account.digits || 6,
        step: account.period || 30,
      };
      return authenticator.generate(cleanSecret);
    }

    const delta = (account.period || 30) * 1000; // convert to milliseconds

    // set epoch to future time to get next code
    authenticator.options = {
      digits: account.digits || 6,
      step: account.period || 30,
      epoch: Date.now() + offset * delta,
    };

    const offsetToken = authenticator.generate(cleanSecret);
    authenticator.resetOptions();

    return offsetToken;
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
