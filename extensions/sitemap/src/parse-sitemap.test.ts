import { describe, expect, it } from "vitest";
import {
  discoverSitemapUrl,
  fetchSitemap,
  loadSitemapPages,
  parseSitemapXml,
  SitemapError,
  type Fetch,
} from "./parse-sitemap";

const okResponse = (text: string): Response => new Response(text, { status: 200, statusText: "OK" });

const notFoundResponse = (): Response => new Response("Not Found", { status: 404, statusText: "Not Found" });

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

describe("parseSitemapXml", () => {
  it("parses a flat urlset", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
  </url>
</urlset>`;

    const result = parseSitemapXml(xml);

    expect(result).toEqual({
      kind: "pages",
      pages: [
        { url: "https://example.com/", lastModified: "2024-01-01", changefreq: "daily", priority: "1.0" },
        { url: "https://example.com/about", lastModified: undefined, changefreq: undefined, priority: undefined },
      ],
    });
  });

  it("parses a sitemap index", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-posts.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-pages.xml</loc>
  </sitemap>
</sitemapindex>`;

    const result = parseSitemapXml(xml);

    expect(result).toEqual({
      kind: "index",
      sitemapUrls: ["https://example.com/sitemap-posts.xml", "https://example.com/sitemap-pages.xml"],
    });
  });

  it("returns an empty page list for an empty urlset", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;

    const result = parseSitemapXml(xml);

    expect(result).toEqual({ kind: "pages", pages: [] });
  });

  it("throws for invalid XML", () => {
    expect(() => parseSitemapXml("not valid xml")).toThrow();
  });
});

describe("discoverSitemapUrl", () => {
  it("returns the URL unchanged when it already points to a sitemap", async () => {
    const result = await discoverSitemapUrl("https://example.com/sitemap.xml", () =>
      Promise.reject(new Error("should not be called")),
    );

    expect(result).toBe("https://example.com/sitemap.xml");
  });

  it("returns /sitemap.xml when it is reachable", async () => {
    const fetch: Fetch = async (url) => {
      if (url === "https://example.com/sitemap.xml") {
        return okResponse("");
      }
      return notFoundResponse();
    };

    const result = await discoverSitemapUrl("https://example.com/page", fetch);

    expect(result).toBe("https://example.com/sitemap.xml");
  });

  it("follows robots.txt when /sitemap.xml is missing", async () => {
    const fetch: Fetch = async (url) => {
      if (url === "https://example.com/sitemap.xml") {
        return notFoundResponse();
      }
      if (url === "https://example.com/robots.txt") {
        return okResponse("Sitemap: https://example.com/custom-sitemap.xml");
      }
      return notFoundResponse();
    };

    const result = await discoverSitemapUrl("https://example.com/page", fetch);

    expect(result).toBe("https://example.com/custom-sitemap.xml");
  });

  it("rejects a robots.txt sitemap hosted on another origin", async () => {
    const fetch: Fetch = async (url) => {
      if (url === "https://example.com/robots.txt") {
        return okResponse("Sitemap: http://127.0.0.1:8080/sitemap.xml");
      }
      return notFoundResponse();
    };

    await expect(discoverSitemapUrl("https://example.com/page", fetch)).rejects.toBeInstanceOf(SitemapError);
  });

  it("throws when no sitemap can be found", async () => {
    const fetch: Fetch = async () => notFoundResponse();

    await expect(discoverSitemapUrl("https://example.com/page", fetch)).rejects.toBeInstanceOf(SitemapError);
  });
});

describe("loadSitemapPages", () => {
  it("loads pages from a flat sitemap", async () => {
    const fetch: Fetch = async (url) => {
      if (url === "https://example.com/sitemap.xml") {
        return okResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
  </url>
</urlset>`);
      }
      return notFoundResponse();
    };

    const pages = await loadSitemapPages("https://example.com/sitemap.xml", fetch);

    expect(pages).toEqual([
      { url: "https://example.com/", lastModified: undefined, changefreq: undefined, priority: undefined },
    ]);
  });

  it("recursively loads pages from a sitemap index", async () => {
    const fetch: Fetch = async (url) => {
      if (url === "https://example.com/sitemap.xml") {
        return okResponse(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-posts.xml</loc>
  </sitemap>
</sitemapindex>`);
      }
      if (url === "https://example.com/sitemap-posts.xml") {
        return okResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/post-1</loc>
  </url>
</urlset>`);
      }
      return notFoundResponse();
    };

    const pages = await loadSitemapPages("https://example.com/sitemap.xml", fetch);

    expect(pages).toEqual([
      { url: "https://example.com/post-1", lastModified: undefined, changefreq: undefined, priority: undefined },
    ]);
  });

  it("does not recurse infinitely on a circular sitemap index", async () => {
    const fetch: Fetch = async (url) => {
      if (url === "https://example.com/sitemap.xml") {
        return okResponse(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
  </sitemap>
</sitemapindex>`);
      }
      return notFoundResponse();
    };

    const pages = await loadSitemapPages("https://example.com/sitemap.xml", fetch);

    expect(pages).toEqual([]);
  });

  it("does not fetch sitemap index entries on another origin", async () => {
    const fetch = async (url: string) => {
      if (url === "https://example.com/sitemap.xml") {
        return okResponse(
          `<sitemapindex><sitemap><loc>http://127.0.0.1:8080/sitemap.xml</loc></sitemap></sitemapindex>`,
        );
      }
      throw new Error(`Unexpected request to ${url}`);
    };

    await expect(loadSitemapPages("https://example.com/sitemap.xml", fetch)).rejects.toBeInstanceOf(SitemapError);
  });

  it("rejects redirects to another origin before fetching them", async () => {
    const fetch: Fetch = async (url) => {
      if (url === "https://example.com/sitemap.xml") {
        return new Response(null, { status: 302, headers: { location: "http://127.0.0.1:8080/sitemap.xml" } });
      }
      throw new Error(`Unexpected request to ${url}`);
    };

    await expect(fetchSitemap("https://example.com/sitemap.xml", fetch)).rejects.toBeInstanceOf(SitemapError);
  });

  it("decompresses gzip sitemaps without a content-encoding header", async () => {
    const xml = "<urlset><url><loc>https://example.com/</loc></url></urlset>";
    const fetch: Fetch = async () => new Response(new Uint8Array(await gzip(xml)), { status: 200 });

    await expect(fetchSitemap("https://example.com/sitemap.xml.gz", fetch)).resolves.toBe(xml);
  });

  it("passes a cancellation signal to sitemap requests", async () => {
    let receivedSignal: AbortSignal | undefined;
    const controller = new AbortController();
    const fetch: Fetch = async (_url, init) => {
      receivedSignal = init?.signal ?? undefined;
      return okResponse("<urlset />");
    };

    await loadSitemapPages("https://example.com/sitemap.xml", fetch, new Set(), controller.signal);

    expect(receivedSignal).toBe(controller.signal);
  });
});
