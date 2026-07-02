import { describe, it, expect } from "vitest";
import { buildTargetUrl, ENGINE_IDS, resolveTemplate } from "./searchEngines";

describe("buildTargetUrl", () => {
  it("builds a DuckDuckGo search with encoded spaces", () => {
    expect(buildTargetUrl("rust lifetimes", "duckduckgo")).toBe("https://duckduckgo.com/?q=rust%20lifetimes");
  });

  it("builds each preset engine", () => {
    expect(buildTargetUrl("cats", "google")).toBe("https://www.google.com/search?q=cats");
    expect(buildTargetUrl("cats", "brave")).toBe("https://search.brave.com/search?q=cats");
    expect(buildTargetUrl("cats", "bing")).toBe("https://www.bing.com/search?q=cats");
    expect(buildTargetUrl("cats", "kagi")).toBe("https://kagi.com/search?q=cats");
    expect(buildTargetUrl("cats", "startpage")).toBe("https://www.startpage.com/sp/search?query=cats");
  });

  it("encodes reserved and unicode characters", () => {
    expect(buildTargetUrl("a & b", "duckduckgo")).toBe("https://duckduckgo.com/?q=a%20%26%20b");
    expect(buildTargetUrl("café", "duckduckgo")).toBe("https://duckduckgo.com/?q=caf%C3%A9");
    expect(buildTargetUrl("c++", "duckduckgo")).toBe("https://duckduckgo.com/?q=c%2B%2B");
  });

  it("uses a valid custom template", () => {
    expect(buildTargetUrl("gpt", "custom", "https://www.perplexity.ai/search?q={query}")).toBe(
      "https://www.perplexity.ai/search?q=gpt",
    );
  });

  it("substitutes every occurrence of {query}", () => {
    expect(buildTargetUrl("x", "custom", "https://e.com/{query}/{query}")).toBe("https://e.com/x/x");
  });

  it("falls back to DuckDuckGo when custom template is blank or missing {query}", () => {
    expect(buildTargetUrl("y", "custom", "")).toBe("https://duckduckgo.com/?q=y");
    expect(buildTargetUrl("y", "custom", "https://no-token.example.com/")).toBe("https://duckduckgo.com/?q=y");
  });

  it("falls back to DuckDuckGo when a custom template has no http(s) scheme", () => {
    expect(buildTargetUrl("y", "custom", "duckduckgo.com/?q={query}")).toBe("https://duckduckgo.com/?q=y");
    expect(buildTargetUrl("y", "custom", "ftp://x.com/{query}")).toBe("https://duckduckgo.com/?q=y");
  });
});

describe("ENGINE_IDS", () => {
  it("stays in sync with the preset templates plus custom", () => {
    expect(ENGINE_IDS).toEqual(["duckduckgo", "google", "brave", "bing", "kagi", "startpage", "custom"]);
  });
});

describe("resolveTemplate", () => {
  it("returns the default template for an unknown engine", () => {
    // @ts-expect-error exercising the runtime fallback with a bad id
    expect(resolveTemplate("bogus")).toBe("https://duckduckgo.com/?q={query}");
  });
});
