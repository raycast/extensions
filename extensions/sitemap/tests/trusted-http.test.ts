import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertTrustedUrl,
  assertTrustedRedirect,
  createUrlPolicy,
  isPublicAddress,
  requestPinned,
  type ResolvedAddress,
} from "../src/trusted-http";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("trusted URLs", () => {
  it("accepts only globally reachable addresses", () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
    expect(isPublicAddress("127.0.0.1")).toBe(false);
    expect(isPublicAddress("100.100.100.200")).toBe(false);
    expect(isPublicAddress("198.18.0.1")).toBe(false);
    expect(isPublicAddress("224.0.0.1")).toBe(false);
    expect(() => createUrlPolicy("http://100.100.100.200/sitemap.xml")).toThrow("public HTTP(S)");
  });

  it("allows a same-host HTTPS upgrade but rejects unsafe URL changes", () => {
    const policy = createUrlPolicy("http://example.com/article");

    expect(assertTrustedUrl("https://example.com/sitemap.xml", policy).toString()).toBe(
      "https://example.com/sitemap.xml",
    );
    expect(() => assertTrustedUrl("http://other.example/sitemap.xml", policy)).toThrow(
      "URLs must belong to the same website: http://example.com/article and http://other.example/sitemap.xml",
    );
    expect(() => assertTrustedUrl("file:///etc/passwd", policy)).toThrow("public HTTP(S)");
    expect(() => assertTrustedUrl("http://user:password@example.com/sitemap.xml", policy)).toThrow("credentials");
    expect(() =>
      assertTrustedRedirect("http://example.com/sitemap.xml", "https://example.com/sitemap.xml", policy),
    ).toThrow("downgrade");
  });

  it("allows the website domain and its subdomains", () => {
    const apexPolicy = createUrlPolicy("http://example.com/article");
    expect(assertTrustedUrl("https://www.example.com/sitemap.xml", apexPolicy).toString()).toBe(
      "https://www.example.com/sitemap.xml",
    );

    const wwwPolicy = createUrlPolicy("https://www.example.com/article");
    expect(assertTrustedUrl("https://example.com/sitemap.xml", wwwPolicy).toString()).toBe(
      "https://example.com/sitemap.xml",
    );
    expect(assertTrustedUrl("https://store.example.com/sitemap.xml", wwwPolicy).toString()).toBe(
      "https://store.example.com/sitemap.xml",
    );
    expect(
      assertTrustedUrl(
        "https://pages.ebay.com/sitemap.xml",
        createUrlPolicy("https://www.ebay.com/sch/i.html?_nkw=%0A&rt=nc&LH_Sold=1&LH_Complete=1"),
      ),
    ).toBeInstanceOf(URL);
    expect(() => assertTrustedUrl("https://other-example.com/sitemap.xml", wwwPolicy)).toThrow("same website");
  });
});

describe("pinned requests", () => {
  it("connects to the validated address instead of resolving the hostname again", async () => {
    const server = createServer((_request, response) => response.end("pinned"));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP server address");

    const validatedAddresses: readonly ResolvedAddress[] = [{ address: "127.0.0.1", family: 4 }];
    const result = await requestPinned(
      `http://must-not-resolve.invalid:${address.port}/sitemap.xml`,
      validatedAddresses,
      AbortSignal.timeout(1_000),
      1024,
    );

    expect(new TextDecoder().decode(result.body)).toBe("pinned");
  });

  it("rejects oversized response bodies", async () => {
    const server = createServer((_request, response) => {
      response.setHeader("content-length", "2048");
      response.end("x".repeat(2048));
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP server address");

    await expect(
      requestPinned(
        `http://must-not-resolve.invalid:${address.port}/sitemap.xml`,
        [{ address: "127.0.0.1", family: 4 }],
        AbortSignal.timeout(1_000),
        1024,
      ),
    ).rejects.toThrow("size limit");
  });
});
