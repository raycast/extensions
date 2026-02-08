import { base64Decode } from "../base64-decode";

describe("base64Decode", () => {
  it("should decode Base64 to text", () => {
    expect(base64Decode.transform("aGVsbG8=")).toBe("hello");
  });

  it("should decode longer Base64 strings", () => {
    expect(base64Decode.transform("aGVsbG8gd29ybGQ=")).toBe("hello world");
  });

  it("should handle empty string", () => {
    expect(base64Decode.transform("")).toBe("");
  });

  it("should return error for invalid Base64", () => {
    const result = base64Decode.transform("not!valid@base64#");
    expect(result).toBe("Error: Invalid Base64 input");
  });
});
