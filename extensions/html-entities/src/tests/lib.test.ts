import { filterEntities, sortEntities } from "../lib";
import { EntitiesResponse } from "../types";

describe("lib", () => {
  describe("filterEntities", () => {
    it("should only return entities that end with a semicolon", () => {
      const entities: EntitiesResponse = {
        "&amp;": { codepoints: [100], characters: "amp" },
        "&lt;": { codepoints: [100], characters: "lt" },
        "&gt": { codepoints: [100], characters: "gt" },
      };

      const filtered = Object.entries(entities).filter((entity) => filterEntities(entity, ""));

      expect(filtered.length).toBe(2);
    });

    it("should return entities that match the search text", () => {
      const search = "rarr";

      const entities: EntitiesResponse = {
        "&rarr;": { codepoints: [100], characters: "crarr" },
        "&crarr;": { codepoints: [100], characters: "crarr" },
        "&lrarr": { codepoints: [100], characters: "lrarr" }, // Invalid, no semicolon
        "&lt;": { codepoints: [100], characters: "lt" }, // Invalid, doesn't match search
        "&gt": { codepoints: [100], characters: "gt" }, // Invalid, doesn't match search
      };

      const filtered = Object.entries(entities).filter((entity) => filterEntities(entity, search));

      expect(filtered.length).toBe(2);
    });

    it("should return no results for an invalid search", () => {
      const search = "asdfasdfasdfasdfa";

      const entities: EntitiesResponse = {
        "&rarr;": { codepoints: [100], characters: "crarr" },
        "&crarr;": { codepoints: [100], characters: "crarr" },
      };

      const filtered = Object.entries(entities).filter((entity) => filterEntities(entity, search));

      expect(filtered.length).toBe(0);
    });
  });

  describe("sortEntities", () => {
    it("should sort entities by name", () => {
      const search = "rarr";

      const entities: EntitiesResponse = {
        "&Rarr;": { codepoints: [100], characters: "↠" }, // Same sorting priority as &rArr;
        "&rarr;": { codepoints: [200], characters: "→" },
        "&rArr;": { codepoints: [300], characters: "⇒" }, // Same sorting priority as &Rarr;
        "&curarr;": { codepoints: [400], characters: "↷" },
      };

      const filtered = Object.entries(entities).filter((entity) => filterEntities(entity, search));

      const sorted = filtered.sort((a, b) => sortEntities(a, b, search)).map(([name]) => name);

      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      expect(filtered.length).toBe(4);
      expect(first).toBe("&rarr;"); // Exact case-sensitive matches come first
      expect(last).toBe("&curarr;"); // Fuzzy matches come last
    });
  });
});
