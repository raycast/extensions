import { ensureProtocol } from "../../utils/url";

describe("ensureProtocol", () => {
  it("returns URL as-is if already has https://", () => {
    expect(ensureProtocol("https://example.com")).toBe("https://example.com");
  });

  it("returns URL as-is if already has http://", () => {
    expect(ensureProtocol("http://example.com")).toBe("http://example.com");
  });

  it("prepends https:// if no protocol", () => {
    expect(ensureProtocol("example.com")).toBe("https://example.com");
  });

  it("trims whitespace from input", () => {
    expect(ensureProtocol("  https://example.com  ")).toBe(
      "https://example.com",
    );
  });

  it("handles URL with leading/trailing spaces and no protocol", () => {
    expect(ensureProtocol("  example.com  ")).toBe("https://example.com");
  });

  it("handles empty string", () => {
    expect(ensureProtocol("")).toBe("https://");
  });
});
