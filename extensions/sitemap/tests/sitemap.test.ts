import { describe, expect, it } from "vitest";
import { createSitemapLoader, parseSitemapXml, SitemapError } from "../src/sitemap";
import type { TrustedHttp, TrustedResponse } from "../src/trusted-http";

const response = (url: string, body: string, status = 200, headers: Record<string, string> = {}): TrustedResponse => ({
  status,
  url: new URL(url),
  headers: new Headers(headers),
  body: new TextEncoder().encode(body),
});

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function fakeHttp(responses: Readonly<Record<string, TrustedResponse>>): TrustedHttp {
  return {
    async get(url) {
      return responses[url] ?? response(url, "Not Found", 404);
    },
  };
}

describe("parseSitemapXml", () => {
  it("parses entries and omits malformed optional metadata", () => {
    const result = parseSitemapXml(
      `<urlset>
        <url><loc>https://example.com/a</loc><lastmod>2024-04-03</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>
        <url><loc>https://example.com/b</loc><lastmod>yesterday</lastmod><changefreq>sometimes</changefreq><priority>high</priority></url>
      </urlset>`,
      "https://example.com/article",
    );

    expect(result).toEqual({
      kind: "entries",
      entries: [
        { url: "https://example.com/a", lastModified: "2024-04-03", changeFrequency: "daily", priority: "0.8" },
        { url: "https://example.com/b", lastModified: undefined, changeFrequency: undefined, priority: undefined },
      ],
    });
  });

  it("parses a sitemap with an XML declaration", () => {
    expect(
      parseSitemapXml(
        '<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>https://example.com/a</loc></url></urlset>',
        "https://example.com",
      ),
    ).toMatchObject({ entries: [{ url: "https://example.com/a" }] });
  });

  it("omits optional metadata with an invalid XML shape", () => {
    expect(
      parseSitemapXml(
        "<urlset><url><loc>https://example.com/a</loc><lastmod><value>2024-01-01</value></lastmod></url></urlset>",
        "https://example.com",
      ),
    ).toMatchObject({ entries: [{ url: "https://example.com/a", lastModified: undefined }] });
  });

  it("rejects unsafe entry URLs and malformed XML features", () => {
    expect(() =>
      parseSitemapXml("<urlset><url><loc>file:///etc/passwd</loc></url></urlset>", "https://example.com"),
    ).toThrow("same public website");
    expect(() => parseSitemapXml("<!DOCTYPE urlset><urlset />", "https://example.com")).toThrow("DOCTYPE");
    expect(() => parseSitemapXml("<urlset><url></urlset>", "https://example.com")).toThrow("malformed");
    expect(() => parseSitemapXml("<urlset /> trailing text", "https://example.com")).toThrow();
    expect(() =>
      parseSitemapXml("<urlset><url><loc>https://example.com/a?x=&evil;</loc></url></urlset>", "https://example.com"),
    ).toThrow("entities");
  });

  it("decodes the predefined XML entities used in URLs", () => {
    expect(
      parseSitemapXml(
        "<urlset><url><loc>https://example.com/search?a=1&amp;b=2</loc></url></urlset>",
        "https://example.com",
      ),
    ).toMatchObject({ entries: [{ url: "https://example.com/search?a=1&b=2" }] });
  });
});

describe("sitemap loading", () => {
  it("loads every robots.txt sitemap and deduplicates entries in source order", async () => {
    const loader = createSitemapLoader(
      fakeHttp({
        "https://example.com/sitemap.xml": response("https://example.com/sitemap.xml", "", 404),
        "https://example.com/robots.txt": response(
          "https://example.com/robots.txt",
          "Sitemap: https://example.com/posts.xml\nSitemap: https://example.com/pages.xml",
        ),
        "https://example.com/posts.xml": response(
          "https://example.com/posts.xml",
          "<urlset><url><loc>https://example.com/b</loc></url><url><loc>https://example.com/a</loc></url></urlset>",
        ),
        "https://example.com/pages.xml": response(
          "https://example.com/pages.xml",
          "<urlset><url><loc>https://example.com/a</loc></url><url><loc>https://example.com/c</loc></url></urlset>",
        ),
      }),
    );

    const entries = await loader.load("https://example.com/article");

    expect(entries.map(({ url }) => url)).toEqual([
      "https://example.com/b",
      "https://example.com/a",
      "https://example.com/c",
    ]);
  });

  it("loads nested sitemap indexes", async () => {
    const loader = createSitemapLoader(
      fakeHttp({
        "https://example.com/sitemap.xml": response(
          "https://example.com/sitemap.xml",
          "<sitemapindex><sitemap><loc>https://example.com/posts.xml</loc></sitemap></sitemapindex>",
        ),
        "https://example.com/posts.xml": response(
          "https://example.com/posts.xml",
          "<urlset><url><loc>https://example.com/post</loc></url></urlset>",
        ),
      }),
    );

    await expect(loader.load("https://example.com/home")).resolves.toEqual([
      {
        url: "https://example.com/post",
        lastModified: undefined,
        changeFrequency: undefined,
        priority: undefined,
      },
    ]);
  });

  it("ignores a sitemap URL that could not be fetched and continues", async () => {
    const missingSitemapUrl = "https://example.com/missing.xml";
    const validSitemapUrl = "https://example.com/posts.xml";
    const loader = createSitemapLoader(
      fakeHttp({
        "https://example.com/sitemap.xml": response(
          "https://example.com/sitemap.xml",
          `<sitemapindex><sitemap><loc>${missingSitemapUrl}</loc></sitemap><sitemap><loc>${validSitemapUrl}</loc></sitemap></sitemapindex>`,
        ),
        [missingSitemapUrl]: response(missingSitemapUrl, "Not Found", 404),
        [validSitemapUrl]: response(
          validSitemapUrl,
          "<urlset><url><loc>https://example.com/post</loc></url></urlset>",
        ),
      }),
    );

    await expect(loader.load("https://example.com/home")).resolves.toMatchObject([
      { url: "https://example.com/post" },
    ]);
  });

  it("ignores a sitemap containing a DOCTYPE and continues", async () => {
    const invalidSitemapUrl = "https://example.com/invalid.xml";
    const validSitemapUrl = "https://example.com/posts.xml";
    const loader = createSitemapLoader(
      fakeHttp({
        "https://example.com/sitemap.xml": response(
          "https://example.com/sitemap.xml",
          `<sitemapindex><sitemap><loc>${invalidSitemapUrl}</loc></sitemap><sitemap><loc>${validSitemapUrl}</loc></sitemap></sitemapindex>`,
        ),
        [invalidSitemapUrl]: response(invalidSitemapUrl, "<!DOCTYPE urlset><urlset />"),
        [validSitemapUrl]: response(
          validSitemapUrl,
          "<urlset><url><loc>https://example.com/post</loc></url></urlset>",
        ),
      }),
    );

    await expect(loader.load("https://example.com/home")).resolves.toMatchObject([
      { url: "https://example.com/post" },
    ]);
  });

  it("loads more than 50 sitemap files", async () => {
    const sitemapUrls = Array.from({ length: 51 }, (_, index) => `https://www.example.com/${index}.xml`);
    const responses: Record<string, TrustedResponse> = {
      "https://example.com/sitemap.xml": response(
        "https://example.com/sitemap.xml",
        `<sitemapindex>${sitemapUrls.map((url) => `<sitemap><loc>${url}</loc></sitemap>`).join("")}</sitemapindex>`,
      ),
    };
    for (const sitemapUrl of sitemapUrls) responses[sitemapUrl] = response(sitemapUrl, "<urlset />");

    await expect(createSitemapLoader(fakeHttp(responses)).load("https://example.com/home")).resolves.toEqual([]);
  });

  it("reuses the sitemap response fetched during discovery", async () => {
    let requests = 0;
    const http: TrustedHttp = {
      async get(url) {
        requests++;
        return response(url, "<urlset><url><loc>https://example.com/a</loc></url></urlset>");
      },
    };

    await expect(createSitemapLoader(http).load("https://example.com/home")).resolves.toHaveLength(1);
    expect(requests).toBe(1);
  });

  it("loads a gzip-compressed direct Sitemap URL", async () => {
    const sitemapUrl = "https://example.com/sitemap.xml.gz";
    const xml = "<urlset><url><loc>https://example.com/compressed</loc></url></urlset>";
    const http = fakeHttp({
      [sitemapUrl]: { ...response(sitemapUrl, ""), body: await gzip(xml) },
    });

    await expect(createSitemapLoader(http).load(sitemapUrl)).resolves.toMatchObject([
      { url: "https://example.com/compressed" },
    ]);
  });

  it("does not decompress an HTTP-decoded gzip response twice", async () => {
    const sitemapUrl = "https://example.com/sitemap.xml.gz";
    const xml = "<urlset><url><loc>https://example.com/decoded</loc></url></urlset>";
    const http = fakeHttp({
      [sitemapUrl]: response(sitemapUrl, xml, 200, { "content-encoding": "gzip" }),
    });

    await expect(createSitemapLoader(http).load(sitemapUrl)).resolves.toMatchObject([
      { url: "https://example.com/decoded" },
    ]);
  });

  it("stops gzip decompression at the per-file limit", async () => {
    const sitemapUrl = "https://example.com/sitemap.xml.gz";
    const oversizedXml = `<urlset>${" ".repeat(1.1 * 1024 * 1024)}</urlset>`;
    const http = fakeHttp({
      [sitemapUrl]: { ...response(sitemapUrl, ""), body: await gzip(oversizedXml) },
    });

    await expect(createSitemapLoader(http).load(sitemapUrl)).rejects.toThrow(
      "Decompressed sitemaps cannot exceed 1 MB",
    );
  });

  it("enforces the traversal-wide byte budget", async () => {
    const sitemapUrls = Array.from({ length: 6 }, (_, index) => `https://example.com/${index}.xml`);
    const robots = sitemapUrls.map((url) => `Sitemap: ${url}`).join("\n");
    const responses: Record<string, TrustedResponse> = {
      "https://example.com/sitemap.xml": response("https://example.com/sitemap.xml", "", 404),
      "https://example.com/robots.txt": response("https://example.com/robots.txt", robots),
    };
    for (const sitemapUrl of sitemapUrls) {
      responses[sitemapUrl] = { ...response(sitemapUrl, "<urlset />"), transferredBytes: 1024 * 1024 };
    }

    await expect(createSitemapLoader(fakeHttp(responses)).load("https://example.com/home")).rejects.toThrow(
      "5 MB in total",
    );
  });

  it("includes compressed transfer size in the traversal budget", async () => {
    const sitemapUrls = Array.from({ length: 6 }, (_, index) => `https://example.com/${index}.xml`);
    const responses: Record<string, TrustedResponse> = {
      "https://example.com/sitemap.xml": response("https://example.com/sitemap.xml", "", 404),
      "https://example.com/robots.txt": response(
        "https://example.com/robots.txt",
        sitemapUrls.map((url) => `Sitemap: ${url}`).join("\n"),
      ),
    };
    for (const sitemapUrl of sitemapUrls) {
      responses[sitemapUrl] = {
        ...response(sitemapUrl, "<urlset />", 200, { "content-encoding": "gzip" }),
        transferredBytes: 1024 * 1024,
      };
    }

    await expect(createSitemapLoader(fakeHttp(responses)).load("https://example.com/home")).rejects.toThrow(
      "5 MB in total",
    );
  });

  it("charges failed discovery responses to the traversal budget", async () => {
    const sitemapUrls = Array.from({ length: 5 }, (_, index) => `https://example.com/${index}.xml`);
    const responses: Record<string, TrustedResponse> = {
      "https://example.com/sitemap.xml": {
        ...response("https://example.com/sitemap.xml", "", 404),
        transferredBytes: 1024 * 1024,
      },
      "https://example.com/robots.txt": response(
        "https://example.com/robots.txt",
        sitemapUrls.map((url) => `Sitemap: ${url}`).join("\n"),
      ),
    };
    for (const sitemapUrl of sitemapUrls) {
      responses[sitemapUrl] = { ...response(sitemapUrl, "<urlset />"), transferredBytes: 1024 * 1024 };
    }

    await expect(createSitemapLoader(fakeHttp(responses)).load("https://example.com/home")).rejects.toThrow(
      "5 MB in total",
    );
  });

  it("enforces entry and nesting limits", async () => {
    const tooManyEntries = Array.from(
      { length: 10_001 },
      (_, index) => `<url><loc>https://example.com/${index}</loc></url>`,
    ).join("");
    const entryLoader = createSitemapLoader(
      fakeHttp({
        "https://example.com/sitemap.xml": response(
          "https://example.com/sitemap.xml",
          `<urlset>${tooManyEntries}</urlset>`,
        ),
      }),
    );
    await expect(entryLoader.load("https://example.com/home")).rejects.toThrow("10000 entries");

    const responses: Record<string, TrustedResponse> = {};
    for (let depth = 0; depth <= 6; depth++) {
      const url = depth === 0 ? "https://example.com/sitemap.xml" : `https://example.com/${depth}.xml`;
      const nextUrl = `https://example.com/${depth + 1}.xml`;
      responses[url] = response(url, `<sitemapindex><sitemap><loc>${nextUrl}</loc></sitemap></sitemapindex>`);
    }
    await expect(createSitemapLoader(fakeHttp(responses)).load("https://example.com/home")).rejects.toThrow("5 levels");
  });

  it("surfaces unsafe discovery failures instead of hiding them", async () => {
    const http: TrustedHttp = {
      async get() {
        throw new SitemapError("Unsafe sitemap");
      },
    };

    await expect(createSitemapLoader(http).load("https://example.com/home")).rejects.toThrow("Unsafe sitemap");
  });
});
