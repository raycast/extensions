import { DdgApiError } from "./errors";

const USERNAME_REGEX = /^[A-Za-z0-9]+$/;

export function normalizeUsername(value: string) {
  const username = value.trim().replace(/@duck\.com$/i, "");

  if (!username) {
    throw new DdgApiError(
      "Invalid Duck Address",
      "Enter your Duck address without @duck.com.",
    );
  }

  if (!USERNAME_REGEX.test(username)) {
    throw new DdgApiError(
      "Invalid Duck Address",
      "Duck addresses can only contain letters and numbers.",
    );
  }

  return username;
}

export function normalizeOtp(value: string) {
  const otp = value.trim().replace(/\s/g, "+");

  if (!otp) {
    throw new DdgApiError(
      "Enter One-Time Passphrase",
      "Paste the four-word passphrase sent by DuckDuckGo.",
    );
  }

  return otp;
}
