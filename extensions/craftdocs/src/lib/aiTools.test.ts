import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({ environment: {}, getPreferenceValues: () => ({}) }));

const { buildCraftApiUrl, buildCreateBlockUrl, parseLocalDate } = await import("./aiTools");

describe("parseLocalDate", () => {
  it("parses YYYY-MM-DD as a local date", () => {
    const date = parseLocalDate("2026-10-03");
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 3]);
  });

  it("rejects malformed and rolled-over dates", () => {
    expect(() => parseLocalDate("2026-02-30")).toThrow();
    expect(() => parseLocalDate("today&x=1")).toThrow();
  });
});

describe("buildCreateBlockUrl", () => {
  it("encodes parameters and maps position", () => {
    expect(buildCreateBlockUrl({ parentBlockId: "a&b", spaceId: "s", content: "x y", position: "beginning" })).toBe(
      "craftdocs://createblock?parentBlockId=a%26b&spaceId=s&content=x%20y&index=0",
    );
  });
});

describe("buildCraftApiUrl", () => {
  const apiUrl = "https://connect.craft.do/links/ID/api/v1/";

  it("builds URLs under the API root", () => {
    expect(buildCraftApiUrl(apiUrl, "/blocks", "id=1").href).toBe(
      "https://connect.craft.do/links/ID/api/v1/blocks?id=1",
    );
  });

  it("keeps a query given inside the path", () => {
    expect(buildCraftApiUrl(apiUrl, "/blocks?id=1").href).toBe("https://connect.craft.do/links/ID/api/v1/blocks?id=1");
  });

  it("keeps # inside the query", () => {
    expect(buildCraftApiUrl(apiUrl, "/blocks/search", "blockId=1&pattern=#tag").href).toBe(
      "https://connect.craft.do/links/ID/api/v1/blocks/search?blockId=1&pattern=%23tag",
    );
  });

  it("refuses non-HTTPS API URLs", () => {
    expect(() => buildCraftApiUrl("http://connect.craft.do/links/ID/api/v1", "/blocks")).toThrow();
  });

  it("refuses paths that escape the API root", () => {
    for (const path of ["x", "/../../other", "/%2e%2e/%2e%2e/other", "@evil.com"]) {
      expect(() => buildCraftApiUrl(apiUrl, path)).toThrow();
    }
  });
});
