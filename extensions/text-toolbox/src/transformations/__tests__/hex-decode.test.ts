import { hexDecode } from "../hex-decode";

describe("hexDecode", () => {
  it("should decode hexadecimal to text", () => {
    expect(hexDecode.transform("68656c6c6f")).toBe("hello");
  });

  it("should handle empty string", () => {
    expect(hexDecode.transform("")).toBe("");
  });

  it("should handle uppercase hex", () => {
    expect(hexDecode.transform("48454C4C4F")).toBe("HELLO");
  });

  it("should handle mixed case hex", () => {
    expect(hexDecode.transform("48656C6c6f")).toBe("Hello");
  });

  it("should handle hex with spaces", () => {
    expect(hexDecode.transform("68 65 6c 6c 6f")).toBe("hello");
  });

  it("should return error for invalid hexadecimal", () => {
    const result = hexDecode.transform("not-valid-hex");
    expect(result).toBe("Error: Invalid hexadecimal input");
  });
});
