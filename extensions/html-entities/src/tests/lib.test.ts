import { filterEntities } from "../lib";
import { EntitiesResponse } from "../types";

describe("lib", () => {
  describe("filterEntities", () => {
    it("should only return entities that end with a semicolon", () => {
      const entities: EntitiesResponse = {
        "&amp;": { codepoints: [100], characters: "amp" },
        "&lt;": { codepoints: [100], characters: "lt" },
        "&gt": { codepoints: [100], characters: "gt" },
      };

      const filtered = filterEntities(entities, "");

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

      const filtered = filterEntities(entities, search);

      expect(filtered.length).toBe(2);
    });

    it("should return no results for an invalid search", () => {
      const search = "asdfasdfasdfasdfa";

      const entities: EntitiesResponse = {
        "&rarr;": { codepoints: [100], characters: "crarr" },
        "&crarr;": { codepoints: [100], characters: "crarr" },
      };

      const filtered = filterEntities(entities, search);

      expect(filtered.length).toBe(0);
    });

    it("should trim extra whitespace", () => {
      const search = "  rarr  ";

      const entities: EntitiesResponse = {
        "&rarr;": { codepoints: [100], characters: "crarr" },
        "&crarr;": { codepoints: [100], characters: "crarr" },
      };

      const filtered = filterEntities(entities, search);

      expect(filtered.length).toBe(2);
    });

    it("should sort entities by name", () => {
      const search = "rarr";

      const entities: EntitiesResponse = {
        "&Rarr;": { codepoints: [100], characters: "↠" }, // Same sorting priority as &rArr;
        "&rarr;": { codepoints: [200], characters: "→" },
        "&rArr;": { codepoints: [300], characters: "⇒" }, // Same sorting priority as &Rarr;
        "&curarr;": { codepoints: [400], characters: "↷" },
      };

      const filtered = filterEntities(entities, search);

      const [firstName] = filtered[0];
      const [lastName] = filtered[filtered.length - 1];

      expect(filtered.length).toBe(4);
      expect(firstName).toBe("&rarr;"); // Exact case-sensitive matches come first
      expect(lastName).toBe("&curarr;"); // Fuzzy matches come last
    });
  });
});
