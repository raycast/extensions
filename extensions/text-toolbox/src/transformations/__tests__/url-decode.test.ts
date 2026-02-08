import { urlDecode } from "../url-decode";

describe("urlDecode", () => {
  it("should decode URL encoded string", () => {
    expect(urlDecode.transform("hello%20world")).toBe("hello world");
  });

  it("should handle empty string", () => {
    expect(urlDecode.transform("")).toBe("");
  });

  it("should decode multiple encoded characters", () => {
    const input = "hello%20world%26test%3D123";
    const result = urlDecode.transform(input);
    expect(result).toBe("hello world&test=123");
  });

  it("should return error for invalid URL encoding", () => {
    const result = urlDecode.transform("hello%ZZworld");
    expect(result).toBe("Error: Invalid URL-encoded input");
  });
});
