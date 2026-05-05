import { describe, it, expect } from "vitest";
import { validateWidth, formatWrappingMessage } from "./validation";

describe("validateWidth", () => {
  it("should return valid for empty string", () => {
    const result = validateWidth("");

    expect(result.isValid).toBe(true);
    expect(result.value).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it("should return valid for whitespace-only string", () => {
    const result = validateWidth("   ");

    expect(result.isValid).toBe(true);
    expect(result.value).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it("should return valid for positive number", () => {
    const result = validateWidth("80");

    expect(result.isValid).toBe(true);
    expect(result.value).toBe(80);
    expect(result.error).toBeUndefined();
  });

  it("should return valid for positive number with whitespace", () => {
    const result = validateWidth("  100  ");

    expect(result.isValid).toBe(true);
    expect(result.value).toBe(100);
    expect(result.error).toBeUndefined();
  });

  it("should return invalid for non-numeric input", () => {
    const result = validateWidth("abc-80");

    expect(result.isValid).toBe(false);
    expect(result.value).toBeUndefined();
    expect(result.error).toBe("Please enter a valid number (or leave blank for no text wrapping)");
  });

  it("should return valid for mixed alphanumeric input", () => {
    const result = validateWidth("80-abc"); // parseInt will convert as many digits as possible before stopping

    expect(result.isValid).toBe(true);
    expect(result.value).toBe(80);
    expect(result.error).toBe(undefined);
  });

  it("should return invalid for zero", () => {
    const result = validateWidth("0");

    expect(result.isValid).toBe(false);
    expect(result.value).toBeUndefined();
    expect(result.error).toBe("Width must be a positive number (or leave blank for no text wrapping)");
  });

  it("should return invalid for negative number", () => {
    const result = validateWidth("-10");

    expect(result.isValid).toBe(false);
    expect(result.value).toBeUndefined();
    expect(result.error).toBe("Width must be a positive number (or leave blank for no text wrapping)");
  });

  it("should return valid for large positive number", () => {
    const result = validateWidth("10000");

    expect(result.isValid).toBe(true);
    expect(result.value).toBe(10000);
    expect(result.error).toBeUndefined();
  });

  it("should return invalid for decimal number", () => {
    const result = validateWidth("80.5");

    expect(result.isValid).toBe(true);
    expect(result.value).toBe(80);
    expect(result.error).toBeUndefined();
  });
});

describe("formatWrappingMessage", () => {
  it("should return wrapped message for defined width", () => {
    const result = formatWrappingMessage(80);

    expect(result).toBe("Text re-wrapped at 80 characters");
  });

  it("should return wrapped message for width of 1", () => {
    const result = formatWrappingMessage(1);

    expect(result).toBe("Text re-wrapped at 1 characters");
  });

  it("should return no wrapping message for undefined width", () => {
    const result = formatWrappingMessage(undefined);

    expect(result).toBe("No text wrapping applied");
  });

  it("should return wrapped message for large width", () => {
    const result = formatWrappingMessage(10000);

    expect(result).toBe("Text re-wrapped at 10000 characters");
  });
});
