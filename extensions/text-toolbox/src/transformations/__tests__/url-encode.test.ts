import { urlEncode } from "../url-encode";

describe("urlEncode", () => {
  it("should encode URL unsafe characters", () => {
    expect(urlEncode.transform("hello world")).toBe("hello%20world");
  });

  it("should encode special characters", () => {
    expect(urlEncode.transform("hello&world=test")).toContain("%");
  });

  it("should handle empty string", () => {
    expect(urlEncode.transform("")).toBe("");
  });

  it("should encode multiple special characters", () => {
    const input = "hello world & test=123";
    const result = urlEncode.transform(input);
    expect(result).toContain("%20");
    expect(result).toContain("%26");
  });
});
