import { describe, expect, it } from "vitest";
import { looksLikeSignInMail, shouldWithhold } from "./redact";

describe("looksLikeSignInMail", () => {
  it.each([
    "Your verification code is 123456",
    "G-735102 is your Google verification code",
    "Use this one-time code to sign in",
    "Your sign-in link",
    "Click this magic link",
    "Your one-time passcode",
    "Reset your password",
  ])("flags %s", (text) => {
    expect(looksLikeSignInMail("Subject", text)).toBe(true);
  });

  it.each(["Lunch on Thursday?", "Your invoice for March", "Contract draft for review"])("leaves %s", (text) => {
    expect(looksLikeSignInMail(text, null)).toBe(false);
  });
});

describe("shouldWithhold", () => {
  it("trusts the server's flag even when the local pattern misses", () => {
    expect(shouldWithhold(true, "Your Acme code", "739201")).toBe(true);
  });

  it("still catches what the local pattern sees without a flag", () => {
    expect(shouldWithhold(undefined, "G-735102 is your Google verification code")).toBe(true);
    expect(shouldWithhold(false, "Lunch?", "Are you free")).toBe(false);
  });
});
