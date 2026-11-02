import { describe, it, expect } from "vitest";
import { getTelegramErrorMessage } from "./errors";

describe("getTelegramErrorMessage", () => {
  it("translates 2FA session password needed", () => {
    expect(getTelegramErrorMessage(new Error("RPCError: 401: SESSION_PASSWORD_NEEDED"))).toBe(
      "This account has 2-Step Verification enabled. Please enter your password to continue.",
    );
  });

  it("translates invalid 2FA password", () => {
    expect(getTelegramErrorMessage(new Error("PASSWORD_HASH_INVALID"))).toBe(
      "Incorrect 2-Step Verification password. Please try again.",
    );
  });

  it("translates invalid API ID", () => {
    expect(getTelegramErrorMessage(new Error("API_ID_INVALID"))).toBe(
      "Invalid API ID or API Hash. Please verify your credentials from https://my.telegram.org/apps in preferences.",
    );
  });

  it("translates expired QR code token", () => {
    expect(getTelegramErrorMessage(new Error("AUTH_TOKEN_EXPIRED"))).toBe(
      "The QR code has expired. Please reload to generate a new QR code.",
    );
  });

  it("translates invalid QR code token", () => {
    expect(getTelegramErrorMessage(new Error("AUTH_TOKEN_INVALID"))).toBe(
      "The QR code is invalid. Please reload to generate a new QR code.",
    );
  });

  it("translates already accepted QR code token", () => {
    expect(getTelegramErrorMessage(new Error("AUTH_TOKEN_ALREADY_ACCEPTED"))).toBe(
      "This QR code has already been used. Please reload to generate a new QR code.",
    );
  });

  it("formats flood wait message", () => {
    expect(getTelegramErrorMessage(new Error("FLOOD_WAIT_30"))).toBe(
      "Rate limited by Telegram. Try again in 30 seconds.",
    );
    expect(getTelegramErrorMessage(new Error("FLOOD_WAIT_120"))).toBe(
      "Rate limited by Telegram. Try again in 2 minutes.",
    );
  });

  it("falls back to error message for other errors", () => {
    expect(getTelegramErrorMessage(new Error("Something went wrong"))).toBe("Something went wrong");
  });
});
