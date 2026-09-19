import { describe, expect, it } from "vitest";
import { compileSearchQuery } from "../src/query";

describe("compileSearchQuery", () => {
  it("compiles Everything-style filters into parameterized SQL", () => {
    const query = compileSearchQuery('report ext:pdf;doc path:"work files" !draft', "files", 100);
    expect(query.sql).toContain("SELECT rowid FROM files_fts WHERE name LIKE ?");
    expect(query.sql).toContain("extension IN (?, ?)");
    expect(query.sql).toContain("NOT");
    expect(query.parameters).toContain("%work files%");
    expect(query.parameters.at(-1)).toBe(100);
  });

  it("keeps Windows drive prefixes as ordinary search text", () => {
    expect(compileSearchQuery("C:\\Users\\Jack", "all", 10).parameters[0]).toBe("%c:\\users\\jack%");
  });
});
