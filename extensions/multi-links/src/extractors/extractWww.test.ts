import { describe, it, expect } from "vitest";
import { extractWww } from "./extractWww";

describe("extractWww (EXT-02)", () => {
  it("extracts www.example.com and normalizes to https://", () => {
    const result = extractWww("visit www.example.com today");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      raw: "www.example.com",
      url: "https://www.example.com",
      type: "web",
    });
  });

  it("does not match www. inside an http URL", () => {
    // extractHttp owns http(s)://; extractWww must not double-match
    expect(extractWww("http://www.example.com")).toEqual([]);
  });

  it("does not match without dot-separated host", () => {
    expect(extractWww("www.")).toEqual([]);
    expect(extractWww("www.foo")).toEqual([]);
  });

  it("captures path suffix", () => {
    const result = extractWww("see www.example.com/path/to/page");
    expect(result[0].raw).toBe("www.example.com/path/to/page");
    expect(result[0].url).toBe("https://www.example.com/path/to/page");
  });

  it("strips trailing punctuation", () => {
    const result = extractWww("at www.example.com.");
    expect(result[0].raw).toBe("www.example.com");
  });
});
