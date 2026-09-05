import { describe, it, expect } from "vitest";
import { extractOtp, isValidOtp } from "../otp";

describe("extractOtp", () => {
  it("extracts a plain numeric code", () => {
    expect(extractOtp("Your verification code is 123456")).toBe("123456");
  });

  it("does not extract a code from CSS-like text", () => {
    expect(extractOtp("font-size: 14px; font-family: NVIDIA;")).toBeUndefined();
  });

  it("returns no code when no number is present", () => {
    expect(extractOtp("Click Verify Email Address to continue")).toBeUndefined();
  });

  it("returns no code when two distinct codes are present", () => {
    expect(extractOtp("Old code 123456; new code 654321")).toBeUndefined();
  });

  it("treats duplicate occurrences as a single candidate", () => {
    expect(extractOtp("Your code is 123456. Enter 123456 to continue.")).toBe("123456");
  });

  it("does not extract a substring of a longer digit sequence", () => {
    expect(extractOtp("Reference 123456789 must not yield any code")).toBeUndefined();
  });

  it("rejects a code mixed with letters", () => {
    expect(extractOtp("Your code is 1234a")).toBeUndefined();
  });

  it("handles boundary digits correctly", () => {
    expect(extractOtp("code: 1234 end")).toBe("1234");
    expect(extractOtp("code: 12345678 end")).toBe("12345678");
    expect(extractOtp("code: 123 end")).toBeUndefined();
    expect(extractOtp("code: 123456789 end")).toBeUndefined();
  });
});

describe("isValidOtp", () => {
  it("accepts 4-8 digit codes", () => {
    expect(isValidOtp("1234")).toBe(true);
    expect(isValidOtp("12345678")).toBe(true);
    expect(isValidOtp("123456")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isValidOtp(undefined)).toBe(false);
    expect(isValidOtp("font-size")).toBe(false);
    expect(isValidOtp("1234a")).toBe(false);
    expect(isValidOtp("123456789")).toBe(false);
    expect(isValidOtp("123")).toBe(false);
    expect(isValidOtp("")).toBe(false);
  });
});
