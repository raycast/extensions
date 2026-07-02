import { describe, it, expect } from "vitest";
import { buildMozPlacesQuery } from "../constants";

describe("buildMozPlacesQuery", () => {
  it("includes ESCAPE clause and respects the limit", () => {
    const sql = buildMozPlacesQuery("react", 10);
    expect(sql).toContain("ESCAPE");
    expect(sql).toContain("LIMIT 10");
  });

  it("escapes % wildcard in the search term", () => {
    const sql = buildMozPlacesQuery("50%", 5);
    expect(sql).toContain("50\\%");
    expect(sql).not.toContain("50%%");
  });

  it("escapes _ wildcard in the search term", () => {
    const sql = buildMozPlacesQuery("react_router", 5);
    expect(sql).toContain("react\\_router");
    expect(sql).not.toContain("react_router");
  });

  it("escapes backslash (the ESCAPE character itself)", () => {
    const sql = buildMozPlacesQuery("foo\\bar", 5);
    expect(sql).toContain("foo\\\\bar");
  });

  it("escapes SQL single quotes", () => {
    const sql = buildMozPlacesQuery("it's", 5);
    expect(sql).toContain("it''s");
  });
});
