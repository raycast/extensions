import { describe, expect, it } from "vitest";
import {
  getAiSearchUrl,
  getIcon,
  getItemAiUrl,
  getItemNormalUrl,
  getItemUrl,
  getSearchUrl,
  isSafeUrl,
  normalizeNavigationUrl,
} from "../src/utils/resultUtils";
import { SearchResult } from "../src/utils/types";

describe("resultUtils - URL generation and validation", () => {
  it("generates correctly formatted regular Google search URL", () => {
    const url = getSearchUrl("react hooks");
    expect(url).toBe("https://www.google.com/search?q=react%20hooks");
  });

  it("properly encodes special characters and symbols in regular search", () => {
    const query = "c++ & algorithms = 100% #1?";
    const url = getSearchUrl(query);
    expect(url).toBe(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
  });

  it("generates correctly formatted AI search URL with udm=50", () => {
    const url = getAiSearchUrl("machine learning");
    expect(url).toBe("https://www.google.com/search?q=machine%20learning&udm=50");
  });

  it("preserves udm=50 parameter and encodes queries in AI search", () => {
    const query = "quantum computing & physics";
    const url = getAiSearchUrl(query);
    expect(url).toBe(`https://www.google.com/search?q=${encodeURIComponent(query)}&udm=50`);
    expect(url).toContain("&udm=50");
  });

  it("validates safe HTTP and HTTPS URLs", () => {
    expect(isSafeUrl("https://raycast.com")).toBe(true);
    expect(isSafeUrl("http://localhost:3000")).toBe(true);
    expect(isSafeUrl("https://github.com/raycast/extensions?query=test#hash")).toBe(true);
  });

  it("rejects unsafe or non-HTTP schemes", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,<h1>exploit</h1>")).toBe(false);
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeUrl("ftp://ftp.example.com")).toBe(false);
    expect(isSafeUrl("not-a-url")).toBe(false);
  });

  describe("normalizeNavigationUrl (Greptile Finding 1)", () => {
    it("preserves valid lowercase HTTP and HTTPS URLs", () => {
      expect(normalizeNavigationUrl("https://github.com")).toBe("https://github.com");
      expect(normalizeNavigationUrl("http://example.com/path")).toBe("http://example.com/path");
    });

    it("preserves uppercase and mixed-case HTTP and HTTPS URLs without corrupting host", () => {
      expect(normalizeNavigationUrl("HTTPS://github.com")).toBe("HTTPS://github.com");
      expect(normalizeNavigationUrl("hTtP://example.com/sub")).toBe("hTtP://example.com/sub");
    });

    it("prepends https:// to scheme-less valid hostnames", () => {
      expect(normalizeNavigationUrl("github.com")).toBe("https://github.com");
      expect(normalizeNavigationUrl("raycast.com/pricing?ref=app")).toBe("https://raycast.com/pricing?ref=app");
    });

    it("rejects dangerous or non-HTTP schemes without prepending https://", () => {
      expect(normalizeNavigationUrl("file:///etc/passwd")).toBeNull();
      expect(normalizeNavigationUrl("javascript:alert(1)")).toBeNull();
      expect(normalizeNavigationUrl("data:text/html,<h1>exploit</h1>")).toBeNull();
      expect(normalizeNavigationUrl("ftp://ftp.example.com")).toBeNull();
      expect(normalizeNavigationUrl("blob:https://example.com/uuid")).toBeNull();
    });

    it("rejects empty, whitespace, and malformed inputs", () => {
      expect(normalizeNavigationUrl("")).toBeNull();
      expect(normalizeNavigationUrl("   ")).toBeNull();
      expect(normalizeNavigationUrl("http:example.com")).toBeNull();
      expect(normalizeNavigationUrl("http://")).toBeNull();
    });
  });

  describe("getItemNormalUrl", () => {
    it("returns destination URL for navigation results", () => {
      const navItem: SearchResult = {
        id: "nav-1",
        query: "github.com",
        description: "Open URL",
        url: "https://github.com",
        isNavigation: true,
      };
      expect(getItemNormalUrl(navItem)).toBe("https://github.com");
    });

    it("falls back to search query URL if navigation URL is unsafe", () => {
      const unsafeItem: SearchResult = {
        id: "unsafe-1",
        query: "malicious",
        description: "Open URL",
        url: "javascript:evil()",
        isNavigation: true,
      };
      expect(getItemNormalUrl(unsafeItem)).toBe("https://www.google.com/search?q=malicious");
    });

    it("returns regular search URL for query suggestions", () => {
      const queryItem: SearchResult = {
        id: "query-1",
        query: "typescript generics",
        description: "Search Google for 'typescript generics'",
        url: "https://www.google.com/search?q=typescript%20generics",
        isNavigation: false,
      };
      expect(getItemNormalUrl(queryItem)).toBe("https://www.google.com/search?q=typescript%20generics");
    });
  });

  describe("getItemAiUrl", () => {
    it("preserves destination URL for navigation results without searching query (Finding 2)", () => {
      const navItem: SearchResult = {
        id: "nav-2",
        query: "github.com",
        description: "Open URL",
        url: "https://github.com",
        isNavigation: true,
      };
      // Must open destination URL, NOT search query with udm=50
      expect(getItemAiUrl(navItem)).toBe("https://github.com");
    });

    it("returns AI search URL with udm=50 for query suggestions (Finding 3)", () => {
      const queryItem: SearchResult = {
        id: "query-2",
        query: "deep learning",
        description: "Search Google for 'deep learning'",
        url: "https://www.google.com/search?q=deep%20learning",
      };
      const aiUrl = getItemAiUrl(queryItem);
      expect(aiUrl).toBe("https://www.google.com/search?q=deep%20learning&udm=50");
      expect(aiUrl).toContain("&udm=50");
    });
  });

  describe("getItemUrl", () => {
    const item: SearchResult = {
      id: "test-item",
      query: "raycast ai",
      url: "https://www.google.com/search?q=raycast%20ai",
    };

    it("returns regular search URL when isAiMode is false", () => {
      expect(getItemUrl(item, false)).toBe("https://www.google.com/search?q=raycast%20ai");
    });

    it("returns AI search URL when isAiMode is true", () => {
      expect(getItemUrl(item, true)).toBe("https://www.google.com/search?q=raycast%20ai&udm=50");
    });
  });

  describe("getIcon", () => {
    it("returns Clock icon for history items", () => {
      const historyItem: SearchResult = {
        id: "hist-1",
        query: "previous search",
        url: "https://www.google.com/search?q=previous%20search",
        isHistory: true,
      };
      expect(getIcon(historyItem)).toBe("clock");
    });

    it("returns Link icon for navigation items", () => {
      const navItem: SearchResult = {
        id: "nav-3",
        query: "google.com",
        url: "https://google.com",
        isNavigation: true,
      };
      expect(getIcon(navItem)).toBe("link");
    });

    it("returns MagnifyingGlass icon for standard search suggestions", () => {
      const queryItem: SearchResult = {
        id: "query-3",
        query: "standard search",
        url: "https://www.google.com/search?q=standard%20search",
      };
      expect(getIcon(queryItem)).toBe("magnifying-glass");
    });
  });
});
