import { hexEncode } from "../hex-encode";

describe("hexEncode", () => {
  it("should encode text to hexadecimal", () => {
    expect(hexEncode.transform("hello")).toBe("68 65 6c 6c 6f");
  });

  it("should encode special characters", () => {
    expect(hexEncode.transform("A")).toBe("41");
  });

  it("should handle empty string", () => {
    expect(hexEncode.transform("")).toBe("");
  });

  it("should encode longer text", () => {
    const result = hexEncode.transform("hello world");
    expect(result).toBeTruthy();
    expect(result).toContain(" ");
  });
});
