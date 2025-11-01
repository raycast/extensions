import { TOTPAccount } from "../types";

export function parseOtpAuthUri(uri: string): Omit<TOTPAccount, "id"> | null {
  try {
    const url = new URL(uri);

    if (url.protocol !== "otpauth:" || url.hostname !== "totp") {
      return null;
    }

    const secret = url.searchParams.get("secret");
    const issuer = url.searchParams.get("issuer") || "";
    const period = parseInt(url.searchParams.get("period") || "30");
    const digits = parseInt(url.searchParams.get("digits") || "6");
    const algorithm = url.searchParams.get("algorithm") || "SHA1";

    if (!secret) {
      return null;
    }

    const name = decodeURIComponent(url.pathname.substring(1));

    return {
      name,
      issuer,
      secret: secret.replace(/\s/g, ""), // remove any whitespace
      period,
      digits,
      algorithm,
    };
  } catch (error) {
    console.error("Failed to parse OTP auth URI:", error);
    return null;
  }
}
