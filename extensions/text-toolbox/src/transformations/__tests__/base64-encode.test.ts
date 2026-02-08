import { base64Encode } from "../base64-encode";

describe("base64Encode", () => {
  it("should encode text to Base64", () => {
    expect(base64Encode.transform("hello")).toBe("aGVsbG8=");
  });

  it("should encode longer text to Base64", () => {
    expect(base64Encode.transform("hello world")).toBe("aGVsbG8gd29ybGQ=");
  });

  it("should handle empty string", () => {
    expect(base64Encode.transform("")).toBe("");
  });

  it("should handle special characters", () => {
    const original = "hello!@#$%^&*()";
    const encoded = base64Encode.transform(original);
    expect(encoded).toBeTruthy();
    expect(encoded.length).toBeGreaterThan(0);
  });
});
