import { htmlDecode } from "../html-decode";

describe("htmlDecode", () => {
  it("should decode HTML entities", () => {
    const result = htmlDecode.transform("&lt;div&gt;");
    expect(result).toBe("<div>");
  });

  it("should decode ampersand", () => {
    expect(htmlDecode.transform("hello &amp; world")).toBe("hello & world");
  });

  it("should handle empty string", () => {
    expect(htmlDecode.transform("")).toBe("");
  });

  it("should decode multiple entities", () => {
    const input = "&lt;div&gt;hello &amp; goodbye&lt;/div&gt;";
    const result = htmlDecode.transform(input);
    expect(result).toBe("<div>hello & goodbye</div>");
  });
});
