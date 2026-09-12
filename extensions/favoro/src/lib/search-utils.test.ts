import { describe, it, expect } from "vitest";
import { searchCachedLinks, getAllCachedLinks, groupResults } from "./search-utils";
import type { CachedData, FavoroLink, FavoroArea, FavoroSection, SearchResultLink } from "../types";

/**
 * Creates a mock FavoroLink for testing
 */
function createMockLink(overrides: {
  id?: string;
  label?: string;
  url?: string;
  description?: string | null;
  areaId?: string;
  sectionId?: string;
}): FavoroLink {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    type: "link",
    attributes: {
      label: overrides.label ?? "Test Link",
      url: overrides.url ?? "https://example.com",
      description: overrides.description ?? null,
      favicon: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    relationships: {
      area: overrides.areaId ? { data: { id: overrides.areaId, type: "area" } } : undefined,
      section: overrides.sectionId ? { data: { id: overrides.sectionId, type: "section" } } : undefined,
    },
  };
}

/**
 * Creates a mock FavoroArea for testing
 */
function createMockArea(id: string, name: string): FavoroArea {
  return {
    id,
    type: "area",
    attributes: {
      name,
      description: null,
      color: null,
      icon: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Creates a mock FavoroSection for testing
 */
function createMockSection(id: string, title: string, areaId?: string): FavoroSection {
  return {
    id,
    type: "section",
    attributes: {
      title,
      description: null,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    relationships: areaId ? { area: { data: { id: areaId, type: "area" } } } : undefined,
  };
}

/**
 * Creates a mock CachedData for testing
 */
function createMockCache(links: FavoroLink[], areas: FavoroArea[] = [], sections: FavoroSection[] = []): CachedData {
  return {
    areas,
    sections,
    links,
    exportedAt: new Date().toISOString(),
    etag: '"test-etag"',
    cacheUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

describe("searchCachedLinks", () => {
  describe("empty and edge cases", () => {
    it("returns empty array for empty query", () => {
      const cache = createMockCache([createMockLink({ label: "Test" })]);
      expect(searchCachedLinks("", cache)).toEqual([]);
    });

    it("returns empty array for whitespace-only query", () => {
      const cache = createMockCache([createMockLink({ label: "Test" })]);
      expect(searchCachedLinks("   ", cache)).toEqual([]);
    });

    it("returns empty array when cache has no links", () => {
      const cache = createMockCache([]);
      expect(searchCachedLinks("test", cache)).toEqual([]);
    });

    it("handles single character terms", () => {
      const cache = createMockCache([
        createMockLink({ label: "A link", url: "https://test.org" }),
        createMockLink({ label: "No mtch", url: "https://test.org" }), // no 'a' anywhere
      ]);
      const results = searchCachedLinks("a", cache);
      expect(results.length).toBe(1);
      expect(results[0].attributes.label).toBe("A link");
    });
  });

  describe("AND logic - multi-term queries", () => {
    it("requires all terms to be present for a match", () => {
      const cache = createMockCache([
        createMockLink({ id: "1", label: "moco control", url: "https://test.org" }),
        createMockLink({ id: "2", label: "mock data", url: "https://test.org" }), // only has "mo"
        createMockLink({ id: "3", label: "company code", url: "https://test.org" }), // only has "co"
      ]);

      const results = searchCachedLinks("mo co", cache);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe("1");
    });

    it("matches terms across different fields", () => {
      const area = createMockArea("area-1", "Work");
      const cache = createMockCache([createMockLink({ id: "1", label: "github", areaId: "area-1" })], [area]);

      const results = searchCachedLinks("work github", cache);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe("1");
    });

    it("excludes links where only some terms match", () => {
      const cache = createMockCache([
        createMockLink({ id: "1", label: "apple" }),
        createMockLink({ id: "2", label: "banana" }),
        createMockLink({ id: "3", label: "apple banana" }),
      ]);

      const results = searchCachedLinks("apple banana", cache);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe("3");
    });
  });

  describe("scoring and prioritization", () => {
    it("prioritizes label matches over URL matches", () => {
      const cache = createMockCache([
        createMockLink({ id: "1", label: "other", url: "https://test.com" }),
        createMockLink({ id: "2", label: "test link", url: "https://example.com" }),
      ]);

      const results = searchCachedLinks("test", cache);

      expect(results[0].id).toBe("2"); // Label match should be first
    });

    it("gives bonus when all terms match in label", () => {
      const cache = createMockCache([
        createMockLink({
          id: "1",
          label: "moco control",
          url: "https://example.com",
        }),
        createMockLink({
          id: "2",
          label: "mo",
          url: "https://co.example.com", // "co" in URL
        }),
      ]);

      const results = searchCachedLinks("mo co", cache);

      expect(results[0].id).toBe("1"); // All terms in label = higher score
    });

    it("sorts results by relevance score descending", () => {
      const cache = createMockCache([
        createMockLink({
          id: "1",
          label: "other",
          description: "test description",
        }),
        createMockLink({ id: "2", label: "test title" }),
        createMockLink({ id: "3", label: "test", url: "https://test.com" }),
      ]);

      const results = searchCachedLinks("test", cache);

      // id:3 has test in both label and URL (10 + 20 bonus + 5 + 10 bonus = 45)
      // id:2 has test in label only (10 + 20 bonus = 30)
      // id:1 has test in description only (3 + 5 bonus = 8)
      expect(results[0].id).toBe("3");
      expect(results[1].id).toBe("2");
      expect(results[2].id).toBe("1");
    });
  });

  describe("searchable fields", () => {
    it("searches in link label", () => {
      const cache = createMockCache([createMockLink({ label: "GitHub Repository" })]);

      const results = searchCachedLinks("github", cache);
      expect(results.length).toBe(1);
    });

    it("searches in link URL", () => {
      const cache = createMockCache([createMockLink({ label: "My Link", url: "https://github.com/repo" })]);

      const results = searchCachedLinks("github", cache);
      expect(results.length).toBe(1);
    });

    it("searches in link description", () => {
      const cache = createMockCache([
        createMockLink({
          label: "Link",
          description: "This is a github related resource",
        }),
      ]);

      const results = searchCachedLinks("github", cache);
      expect(results.length).toBe(1);
    });

    it("searches in area name", () => {
      const area = createMockArea("area-1", "Development");
      const cache = createMockCache([createMockLink({ label: "Some Link", areaId: "area-1" })], [area]);

      const results = searchCachedLinks("development", cache);
      expect(results.length).toBe(1);
    });

    it("searches in section title", () => {
      const section = createMockSection("section-1", "Development Tools");
      const cache = createMockCache([createMockLink({ label: "Some Link", sectionId: "section-1" })], [], [section]);

      const results = searchCachedLinks("tools", cache);
      expect(results.length).toBe(1);
    });
  });

  describe("case insensitivity", () => {
    it("matches regardless of case in query", () => {
      const cache = createMockCache([createMockLink({ label: "GitHub" })]);

      expect(searchCachedLinks("github", cache).length).toBe(1);
      expect(searchCachedLinks("GITHUB", cache).length).toBe(1);
      expect(searchCachedLinks("GitHub", cache).length).toBe(1);
      expect(searchCachedLinks("gitHUB", cache).length).toBe(1);
    });

    it("matches regardless of case in link data", () => {
      const cache = createMockCache([createMockLink({ label: "UPPERCASE LABEL" })]);

      const results = searchCachedLinks("uppercase", cache);
      expect(results.length).toBe(1);
    });
  });

  describe("real-world scenarios", () => {
    it('query "mo co" prioritizes "moco control" over partial matches', () => {
      const cache = createMockCache([
        createMockLink({ id: "moco", label: "moco control", url: "https://test.org" }),
        createMockLink({ id: "mock", label: "mock data", url: "https://test.org" }),
        createMockLink({ id: "company", label: "company portal", url: "https://test.org" }),
        createMockLink({ id: "controller", label: "controller setup", url: "https://test.org" }),
      ]);

      const results = searchCachedLinks("mo co", cache);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe("moco");
    });

    it('query "work github" finds GitHub link in Work area', () => {
      const workArea = createMockArea("work", "Work");
      const personalArea = createMockArea("personal", "Personal");

      const cache = createMockCache(
        [
          createMockLink({ id: "work-gh", label: "GitHub", areaId: "work" }),
          createMockLink({ id: "personal-gh", label: "GitHub", areaId: "personal" }),
        ],
        [workArea, personalArea],
      );

      const results = searchCachedLinks("work github", cache);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe("work-gh");
    });

    it('query "dev tools" finds links in "Development" section', () => {
      const devSection = createMockSection("dev", "Development");

      const cache = createMockCache(
        [
          createMockLink({ id: "dev-tool", label: "My Tools", sectionId: "dev" }),
          createMockLink({ id: "other", label: "Tools", sectionId: "other" }),
        ],
        [],
        [devSection],
      );

      const results = searchCachedLinks("dev tools", cache);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe("dev-tool");
    });

    it("single word queries still work correctly", () => {
      const cache = createMockCache([
        createMockLink({ id: "1", label: "github repository" }),
        createMockLink({ id: "2", label: "gitlab project" }),
        createMockLink({ id: "3", label: "bitbucket repo" }),
      ]);

      const results = searchCachedLinks("github", cache);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe("1");
    });
  });

  describe("result format", () => {
    it("includes area info in results", () => {
      const area = createMockArea("area-1", "Work Area");
      const cache = createMockCache([createMockLink({ label: "test", areaId: "area-1" })], [area]);

      const results = searchCachedLinks("test", cache);

      expect(results[0].area).toEqual({ id: "area-1", name: "Work Area" });
    });

    it("includes section info in results", () => {
      const section = createMockSection("section-1", "My Section");
      const cache = createMockCache([createMockLink({ label: "test", sectionId: "section-1" })], [], [section]);

      const results = searchCachedLinks("test", cache);

      expect(results[0].section).toEqual({ id: "section-1", name: "My Section" });
    });

    it("handles links without area or section", () => {
      const cache = createMockCache([createMockLink({ label: "test" })]);

      const results = searchCachedLinks("test", cache);

      expect(results[0].area).toBeUndefined();
      expect(results[0].section).toBeUndefined();
    });
  });
});

describe("getAllCachedLinks", () => {
  describe("empty and edge cases", () => {
    it("returns empty array when cache has no links", () => {
      const cache = createMockCache([]);
      expect(getAllCachedLinks(cache)).toEqual([]);
    });

    it("returns all links when cache has links", () => {
      const cache = createMockCache([
        createMockLink({ id: "1", label: "Link 1" }),
        createMockLink({ id: "2", label: "Link 2" }),
        createMockLink({ id: "3", label: "Link 3" }),
      ]);

      const results = getAllCachedLinks(cache);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.id)).toEqual(["1", "2", "3"]);
    });
  });

  describe("area and section resolution", () => {
    it("includes area info when link has area relationship", () => {
      const area = createMockArea("area-1", "Work Area");
      const cache = createMockCache([createMockLink({ id: "1", label: "Test", areaId: "area-1" })], [area]);

      const results = getAllCachedLinks(cache);

      expect(results[0].area).toEqual({ id: "area-1", name: "Work Area" });
    });

    it("includes section info when link has section relationship", () => {
      const section = createMockSection("section-1", "Dev Tools");
      const cache = createMockCache(
        [createMockLink({ id: "1", label: "Test", sectionId: "section-1" })],
        [],
        [section],
      );

      const results = getAllCachedLinks(cache);

      expect(results[0].section).toEqual({ id: "section-1", name: "Dev Tools" });
    });

    it("includes both area and section info when link has both", () => {
      const area = createMockArea("area-1", "Work");
      const section = createMockSection("section-1", "Development");
      const cache = createMockCache(
        [createMockLink({ id: "1", label: "Test", areaId: "area-1", sectionId: "section-1" })],
        [area],
        [section],
      );

      const results = getAllCachedLinks(cache);

      expect(results[0].area).toEqual({ id: "area-1", name: "Work" });
      expect(results[0].section).toEqual({ id: "section-1", name: "Development" });
    });

    it("handles links without area or section", () => {
      const cache = createMockCache([createMockLink({ id: "1", label: "Orphan Link" })]);

      const results = getAllCachedLinks(cache);

      expect(results[0].area).toBeUndefined();
      expect(results[0].section).toBeUndefined();
    });

    it("handles missing area reference gracefully", () => {
      // Link references area-1 but area-1 doesn't exist in cache
      const cache = createMockCache([createMockLink({ id: "1", label: "Test", areaId: "nonexistent" })], []);

      const results = getAllCachedLinks(cache);

      expect(results[0].area).toBeUndefined();
    });

    it("handles missing section reference gracefully", () => {
      // Link references section-1 but section-1 doesn't exist in cache
      const cache = createMockCache([createMockLink({ id: "1", label: "Test", sectionId: "nonexistent" })], [], []);

      const results = getAllCachedLinks(cache);

      expect(results[0].section).toBeUndefined();
    });
  });

  describe("link data preservation", () => {
    it("preserves all link attributes", () => {
      const cache = createMockCache([
        createMockLink({
          id: "test-id",
          label: "Test Label",
          url: "https://example.com/test",
          description: "A test description",
        }),
      ]);

      const results = getAllCachedLinks(cache);

      expect(results[0].id).toBe("test-id");
      expect(results[0].attributes.label).toBe("Test Label");
      expect(results[0].attributes.url).toBe("https://example.com/test");
      expect(results[0].attributes.description).toBe("A test description");
    });

    it("maintains link order from cache", () => {
      const cache = createMockCache([
        createMockLink({ id: "first", label: "First" }),
        createMockLink({ id: "second", label: "Second" }),
        createMockLink({ id: "third", label: "Third" }),
      ]);

      const results = getAllCachedLinks(cache);

      expect(results[0].id).toBe("first");
      expect(results[1].id).toBe("second");
      expect(results[2].id).toBe("third");
    });
  });

  describe("performance", () => {
    it("handles large cache efficiently", () => {
      const areas = Array.from({ length: 10 }, (_, i) => createMockArea(`area-${i}`, `Area ${i}`));
      const sections = Array.from({ length: 20 }, (_, i) => createMockSection(`section-${i}`, `Section ${i}`));
      const links = Array.from({ length: 500 }, (_, i) =>
        createMockLink({
          id: `link-${i}`,
          label: `Link ${i}`,
          areaId: `area-${i % 10}`,
          sectionId: `section-${i % 20}`,
        }),
      );

      const cache = createMockCache(links, areas, sections);

      const start = performance.now();
      const results = getAllCachedLinks(cache);
      const duration = performance.now() - start;

      // Should complete in under 50ms
      expect(duration).toBeLessThan(50);
      expect(results).toHaveLength(500);
      // Verify area/section resolution worked
      expect(results[0].area?.name).toBe("Area 0");
      expect(results[0].section?.name).toBe("Section 0");
    });
  });
});

/**
 * Creates a mock SearchResultLink for testing groupResults
 */
function createSearchResultLink(overrides: {
  id?: string;
  label?: string;
  areaId?: string;
  areaName?: string;
  sectionId?: string;
  sectionName?: string;
}): SearchResultLink {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    type: "link",
    attributes: {
      label: overrides.label ?? "Test Link",
      url: "https://example.com",
      description: null,
      favicon: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    area: overrides.areaId ? { id: overrides.areaId, name: overrides.areaName ?? "Area" } : undefined,
    section: overrides.sectionId ? { id: overrides.sectionId, name: overrides.sectionName ?? "Section" } : undefined,
  };
}

describe("groupResults", () => {
  describe("empty and edge cases", () => {
    it("returns empty object for empty array", () => {
      const result = groupResults([]);
      expect(result).toEqual({});
    });

    it("handles single link without area or section", () => {
      const links = [createSearchResultLink({ id: "1", label: "Test" })];

      const result = groupResults(links);

      expect(Object.keys(result)).toEqual(["uncategorized"]);
      expect(result["uncategorized"].area).toEqual({ id: "uncategorized", name: "Uncategorized" });
      expect(result["uncategorized"].sections["uncategorized"].section).toEqual({
        id: "uncategorized",
        name: "Uncategorized",
      });
      expect(result["uncategorized"].sections["uncategorized"].links).toHaveLength(1);
    });
  });

  describe("grouping by area", () => {
    it("groups links by area id", () => {
      const links = [
        createSearchResultLink({ id: "1", areaId: "work", areaName: "Work" }),
        createSearchResultLink({ id: "2", areaId: "work", areaName: "Work" }),
        createSearchResultLink({ id: "3", areaId: "personal", areaName: "Personal" }),
      ];

      const result = groupResults(links);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result["work"]).toBeDefined();
      expect(result["personal"]).toBeDefined();
    });

    it("preserves area name from first link in group", () => {
      const links = [
        createSearchResultLink({ id: "1", areaId: "area-1", areaName: "My Area" }),
        createSearchResultLink({ id: "2", areaId: "area-1", areaName: "My Area" }),
      ];

      const result = groupResults(links);

      expect(result["area-1"].area.name).toBe("My Area");
    });

    it("uses Uncategorized for links without area", () => {
      const links = [createSearchResultLink({ id: "1" })];

      const result = groupResults(links);

      expect(result["uncategorized"].area).toEqual({ id: "uncategorized", name: "Uncategorized" });
    });
  });

  describe("grouping by section", () => {
    it("groups links by section within area", () => {
      const links = [
        createSearchResultLink({ id: "1", areaId: "work", areaName: "Work", sectionId: "dev", sectionName: "Dev" }),
        createSearchResultLink({ id: "2", areaId: "work", areaName: "Work", sectionId: "dev", sectionName: "Dev" }),
        createSearchResultLink({
          id: "3",
          areaId: "work",
          areaName: "Work",
          sectionId: "design",
          sectionName: "Design",
        }),
      ];

      const result = groupResults(links);

      expect(Object.keys(result["work"].sections)).toHaveLength(2);
      expect(result["work"].sections["dev"].links).toHaveLength(2);
      expect(result["work"].sections["design"].links).toHaveLength(1);
    });

    it("preserves section name from first link in group", () => {
      const links = [
        createSearchResultLink({ id: "1", sectionId: "sec-1", sectionName: "My Section" }),
        createSearchResultLink({ id: "2", sectionId: "sec-1", sectionName: "My Section" }),
      ];

      const result = groupResults(links);

      expect(result["uncategorized"].sections["sec-1"].section.name).toBe("My Section");
    });

    it("uses Uncategorized for links without section", () => {
      const links = [createSearchResultLink({ id: "1", areaId: "work", areaName: "Work" })];

      const result = groupResults(links);

      expect(result["work"].sections["uncategorized"].section).toEqual({
        id: "uncategorized",
        name: "Uncategorized",
      });
    });
  });

  describe("link preservation", () => {
    it("preserves all link data in grouped results", () => {
      const link = createSearchResultLink({
        id: "test-id",
        label: "Test Label",
        areaId: "area-1",
        areaName: "Area",
        sectionId: "section-1",
        sectionName: "Section",
      });

      const result = groupResults([link]);
      const groupedLink = result["area-1"].sections["section-1"].links[0];

      expect(groupedLink.id).toBe("test-id");
      expect(groupedLink.attributes.label).toBe("Test Label");
      expect(groupedLink.area).toEqual({ id: "area-1", name: "Area" });
      expect(groupedLink.section).toEqual({ id: "section-1", name: "Section" });
    });

    it("maintains link order within sections", () => {
      const links = [
        createSearchResultLink({ id: "first", areaId: "a", areaName: "A", sectionId: "s", sectionName: "S" }),
        createSearchResultLink({ id: "second", areaId: "a", areaName: "A", sectionId: "s", sectionName: "S" }),
        createSearchResultLink({ id: "third", areaId: "a", areaName: "A", sectionId: "s", sectionName: "S" }),
      ];

      const result = groupResults(links);
      const groupedLinks = result["a"].sections["s"].links;

      expect(groupedLinks[0].id).toBe("first");
      expect(groupedLinks[1].id).toBe("second");
      expect(groupedLinks[2].id).toBe("third");
    });
  });

  describe("complex scenarios", () => {
    it("handles mixed categorized and uncategorized links", () => {
      const links = [
        createSearchResultLink({ id: "1", areaId: "work", areaName: "Work", sectionId: "dev", sectionName: "Dev" }),
        createSearchResultLink({ id: "2" }), // uncategorized
        createSearchResultLink({ id: "3", areaId: "work", areaName: "Work" }), // area but no section
      ];

      const result = groupResults(links);

      expect(Object.keys(result)).toHaveLength(2); // work + uncategorized
      expect(result["work"].sections["dev"].links).toHaveLength(1);
      expect(result["work"].sections["uncategorized"].links).toHaveLength(1);
      expect(result["uncategorized"].sections["uncategorized"].links).toHaveLength(1);
    });

    it("handles multiple areas with multiple sections each", () => {
      const links = [
        createSearchResultLink({ id: "1", areaId: "work", areaName: "Work", sectionId: "dev", sectionName: "Dev" }),
        createSearchResultLink({ id: "2", areaId: "work", areaName: "Work", sectionId: "ops", sectionName: "Ops" }),
        createSearchResultLink({
          id: "3",
          areaId: "personal",
          areaName: "Personal",
          sectionId: "finance",
          sectionName: "Finance",
        }),
        createSearchResultLink({
          id: "4",
          areaId: "personal",
          areaName: "Personal",
          sectionId: "health",
          sectionName: "Health",
        }),
      ];

      const result = groupResults(links);

      expect(Object.keys(result)).toHaveLength(2);
      expect(Object.keys(result["work"].sections)).toHaveLength(2);
      expect(Object.keys(result["personal"].sections)).toHaveLength(2);
      expect(result["work"].sections["dev"].links[0].id).toBe("1");
      expect(result["work"].sections["ops"].links[0].id).toBe("2");
      expect(result["personal"].sections["finance"].links[0].id).toBe("3");
      expect(result["personal"].sections["health"].links[0].id).toBe("4");
    });

    it("handles large number of links efficiently", () => {
      const links: SearchResultLink[] = [];
      for (let i = 0; i < 100; i++) {
        links.push(
          createSearchResultLink({
            id: `link-${i}`,
            areaId: `area-${i % 5}`,
            areaName: `Area ${i % 5}`,
            sectionId: `section-${i % 10}`,
            sectionName: `Section ${i % 10}`,
          }),
        );
      }

      const start = performance.now();
      const result = groupResults(links);
      const duration = performance.now() - start;

      // Should complete in under 50ms
      expect(duration).toBeLessThan(50);
      expect(Object.keys(result)).toHaveLength(5); // 5 areas
    });
  });
});
