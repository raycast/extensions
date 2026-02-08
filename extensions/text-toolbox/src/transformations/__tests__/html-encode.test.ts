import { htmlEncode } from "../html-encode";

describe("htmlEncode", () => {
  it("should encode HTML entities", () => {
    const result = htmlEncode.transform("<div>");
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
  });

  it("should encode ampersand", () => {
    expect(htmlEncode.transform("hello & world")).toContain("&amp;");
  });

  it("should encode quotes", () => {
    const result = htmlEncode.transform('"hello"');
    expect(result).toContain("&quot;");
  });

  it("should handle empty string", () => {
    expect(htmlEncode.transform("")).toBe("");
  });

  it("should encode complex HTML", () => {
    const input = "<div>hello & goodbye</div>";
    const result = htmlEncode.transform(input);
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
    expect(result).toContain("&amp;");
  });
});
