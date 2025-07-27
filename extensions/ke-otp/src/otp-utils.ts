import { authenticator } from "otplib";

export interface OTPConfig {
  secret: string;
  digits?: number;
  period?: number;
  algorithm?: string;
}

export function parseOtpAuthUrl(url: string): OTPConfig {
  const urlObj = new URL(url);
  const params = urlObj.searchParams;

  const secret = params.get("secret");
  if (!secret) {
    throw new Error("Missing secret in OTP URL");
  }

  return {
    secret,
    digits: parseInt(params.get("digits") || "6", 10),
    period: parseInt(params.get("period") || "30", 10),
    algorithm: params.get("algorithm") || "SHA1",
  };
}

export function generateTOTP(config: OTPConfig): string {
  const { secret, digits = 6, period = 30 } = config;

  // Configure authenticator options
  authenticator.options = {
    digits,
    step: period,
  };

  // Generate TOTP token
  return authenticator.generate(secret);
}

export function getRemainingTime(period: number = 30): number {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
}
