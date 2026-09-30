import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import zlib from "node:zlib";
import { AddressInfo } from "node:net";
import { BlockedAddressError, HttpError, isBlockedAddress, isBlockedHostname, safeFetch } from "../src/lib/safe-fetch";

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1",
    "127.8.9.10",
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "100.127.255.255",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "ff02::1",
    "::ffff:127.0.0.1",
    "::ffff:192.168.0.1",
    "::ffff:7f00:1",
    "64:ff9b::a00:1",
  ])("blocks %s", (ip) => expect(isBlockedAddress(ip)).toBe(true));

  it.each(["93.184.216.34", "1.1.1.1", "172.32.0.1", "100.128.0.1", "2606:4700::1111", "64:ff9b::5db8:d822"])(
    "allows %s",
    (ip) => expect(isBlockedAddress(ip)).toBe(false),
  );

  it("blocks anything that isn't an IP address", () => {
    expect(isBlockedAddress("not-an-ip")).toBe(true);
  });
});

describe("isBlockedHostname", () => {
  it.each([
    "localhost",
    "LOCALHOST",
    "localhost.",
    "foo.localhost",
    "router.local",
    "nas.internal",
    "printer.home.arpa",
  ])("blocks %s", (host) => expect(isBlockedHostname(host)).toBe(true));

  it.each(["example.com", "local.example.com", "internal.news", "mylocal.com"])("allows %s", (host) =>
    expect(isBlockedHostname(host)).toBe(false),
  );
});

describe("safeFetch", () => {
  // A local server stands in for the web. The test resolver sends every name to
  // 127.0.0.1 and `allowAddress` lets only that through, so everything else the
  // real rules block stays blocked.
  let server: http.Server;
  let port = 0;
  const routes: Record<string, (res: http.ServerResponse, req: http.IncomingMessage) => void> = {};
  const onlyLoopback = {
    allowAddress: (ip: string) => ip === "127.0.0.1",
    resolve: async () => [{ address: "127.0.0.1", family: 4 as const }],
  };

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const route = routes[req.url ?? ""];
      if (route) route(res, req);
      else res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(() => {
    server.close();
  });

  it("reads a page and follows a redirect after checking it", async () => {
    routes["/a"] = (res) => res.writeHead(302, { location: "/b" }).end();
    routes["/b"] = (res) => res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end("<p>hi</p>");
    const response = await safeFetch(`http://site.test:${port}/a`, onlyLoopback);
    expect(response.url).toBe(`http://site.test:${port}/b`);
    expect(response.status).toBe(200);
    expect(response.contentType).toBe("text/html; charset=utf-8");
    expect(response.body.toString()).toBe("<p>hi</p>");
  });

  it("refuses a redirect to a private address or a .local host", async () => {
    routes["/to-router"] = (res) => res.writeHead(301, { location: "http://192.168.1.1/admin" }).end();
    routes["/to-local"] = (res) => res.writeHead(307, { location: "http://router.local/" }).end();
    await expect(safeFetch(`http://site.test:${port}/to-router`, onlyLoopback)).rejects.toThrow(BlockedAddressError);
    await expect(safeFetch(`http://site.test:${port}/to-local`, onlyLoopback)).rejects.toThrow(BlockedAddressError);
  });

  it("refuses a name when any of its addresses is private (DNS rebinding)", async () => {
    const resolve = async () => [
      { address: "93.184.216.34", family: 4 as const },
      { address: "10.0.0.5", family: 4 as const },
    ];
    await expect(safeFetch("http://rebind.test/", { resolve })).rejects.toThrow(BlockedAddressError);
  });

  it("refuses IP literals and localhost without resolving them", async () => {
    let lookups = 0;
    const resolve = async () => {
      lookups++;
      return [{ address: "93.184.216.34", family: 4 as const }];
    };
    await expect(safeFetch("http://127.0.0.1/", { resolve })).rejects.toThrow(BlockedAddressError);
    await expect(safeFetch("http://[::1]/", { resolve })).rejects.toThrow(BlockedAddressError);
    await expect(safeFetch("http://localhost:8080/", { resolve })).rejects.toThrow(BlockedAddressError);
    await expect(safeFetch("http://[::ffff:192.168.0.1]/", { resolve })).rejects.toThrow(BlockedAddressError);
    expect(lookups).toBe(0);
  });

  it("says which host it refused", async () => {
    await expect(safeFetch("http://router.local/")).rejects.toThrow(
      "Won't read router.local: it's a local or private network address.",
    );
  });

  it("connects to the address it checked, with no second lookup", async () => {
    let lookups = 0;
    const resolve = async () => {
      lookups++;
      return [{ address: "127.0.0.1", family: 4 as const }];
    };
    routes["/pin"] = (res, req) => res.writeHead(200, { "content-type": "text/html" }).end(req.headers.host);
    const response = await safeFetch(`http://pinned.test:${port}/pin`, { ...onlyLoopback, resolve });
    expect(lookups).toBe(1);
    // The Host header still names the site, so virtual hosts work.
    expect(response.body.toString()).toBe(`pinned.test:${port}`);
  });

  it("can name itself instead of looking like a browser", async () => {
    routes["/ua"] = (res, req) => res.writeHead(200, { "content-type": "text/plain" }).end(req.headers["user-agent"]);
    const named = await safeFetch(`http://s.test:${port}/ua`, { ...onlyLoopback, userAgent: "TheDownloader (test)" });
    expect(named.body.toString()).toBe("TheDownloader (test)");
    expect((await safeFetch(`http://s.test:${port}/ua`, onlyLoopback)).body.toString()).toMatch(/Safari/);
  });

  it("only reads http and https", async () => {
    await expect(safeFetch("file:///etc/hosts")).rejects.toThrow(/http/);
    await expect(safeFetch("ftp://example.com/")).rejects.toThrow(/http/);
  });

  it("stops at the size cap, on the wrong content type, on redirect loops and on HTTP errors", async () => {
    routes["/big"] = (res) => res.writeHead(200, { "content-type": "text/html" }).end("x".repeat(3_000));
    routes["/pdf"] = (res) => res.writeHead(200, { "content-type": "application/pdf" }).end("%PDF");
    routes["/loop"] = (res) => res.writeHead(302, { location: "/loop" }).end();
    routes["/gone"] = (res) => res.writeHead(404).end();
    await expect(safeFetch(`http://s.test:${port}/big`, { ...onlyLoopback, maxBytes: 1_000 })).rejects.toThrow(
      /larger than/,
    );
    await expect(
      safeFetch(`http://s.test:${port}/pdf`, { ...onlyLoopback, accept: ["text/html", "application/xhtml+xml"] }),
    ).rejects.toThrow("This link isn't a web page (application/pdf).");
    await expect(safeFetch(`http://s.test:${port}/loop`, onlyLoopback)).rejects.toThrow(/redirects/);
    await expect(safeFetch(`http://s.test:${port}/gone`, onlyLoopback)).rejects.toThrow("HTTP 404 from s.test");
    await expect(safeFetch(`http://s.test:${port}/gone`, onlyLoopback)).rejects.toMatchObject({
      name: "HttpError",
      status: 404,
    });
    expect(new HttpError(403, "x.com")).toBeInstanceOf(Error);
  });

  it("gives up on a server that never answers", async () => {
    routes["/slow"] = () => undefined;
    await expect(safeFetch(`http://s.test:${port}/slow`, { ...onlyLoopback, timeoutMs: 200 })).rejects.toThrow(
      "The page took too long to load.",
    );
  });

  it("can be stopped", async () => {
    routes["/stall"] = () => undefined;
    const controller = new AbortController();
    const pending = safeFetch(`http://s.test:${port}/stall`, { ...onlyLoopback, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("decompresses gzip and brotli", async () => {
    routes["/gz"] = (res) =>
      res
        .writeHead(200, { "content-type": "text/html", "content-encoding": "gzip" })
        .end(zlib.gzipSync("<p>zipped</p>"));
    routes["/br"] = (res) =>
      res
        .writeHead(200, { "content-type": "text/html", "content-encoding": "br" })
        .end(zlib.brotliCompressSync("<p>brotli</p>"));
    expect((await safeFetch(`http://s.test:${port}/gz`, onlyLoopback)).body.toString()).toBe("<p>zipped</p>");
    expect((await safeFetch(`http://s.test:${port}/br`, onlyLoopback)).body.toString()).toBe("<p>brotli</p>");
  });
});
