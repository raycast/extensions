import { describe, it, expect } from "vitest";
import { validateUrl } from "./validation";

describe("validateUrl", () => {
  it("throws when the URL is empty", () => {
    expect(() => validateUrl("", "Image URL")).toThrow(
      "Image URL is required and cannot be empty",
    );
  });

  it("throws when the URL is only whitespace", () => {
    expect(() => validateUrl("   ", "Image URL")).toThrow(
      "Image URL is required and cannot be empty",
    );
  });

  it("throws when the URL cannot be parsed", () => {
    expect(() => validateUrl("not a url", "Video URL")).toThrow(
      'Invalid Video URL format: "not a url" is not a valid URL',
    );
  });

  it("throws when the protocol is not http or https", () => {
    expect(() => validateUrl("ftp://example.com/file", "Link URL")).toThrow(
      "Invalid Link URL protocol: URL must use HTTP or HTTPS (got ftp:)",
    );
  });

  it("accepts http URLs", () => {
    expect(() => validateUrl("http://example.com", "URL")).not.toThrow();
  });

  it("accepts https URLs", () => {
    expect(() =>
      validateUrl("https://example.com/image.jpg", "URL"),
    ).not.toThrow();
  });
});
