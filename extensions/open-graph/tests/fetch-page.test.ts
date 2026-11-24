import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { fetchPage } from "../src/fetch-page.ts";
import { parseOpenGraph } from "../src/util.ts";

test("fetches HTML with redirects, rejects errors, and cancels stalled requests", async (t) => {
  const server = createServer((request, response) => {
    switch (request.url) {
      case "/redirect":
        response.writeHead(302, { Location: "/nested/page" });
        response.end();
        break;
      case "/nested/page":
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end('<meta property="og:image" content="./image.png">');
        break;
      case "/error":
        response.writeHead(503, "Service Unavailable");
        response.end();
        break;
      case "/json":
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end("{}");
        break;
      case "/stalled-body":
        response.writeHead(200, { "Content-Type": "text/html" });
        response.write("<html>");
        break;
      default:
        // Keep the connection open to exercise timeout and cancellation.
        break;
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;

  await t.test("uses the final redirected URL as the image base", async () => {
    const page = await fetchPage(`${base}/redirect`);
    assert.equal(page.finalUrl, `${base}/nested/page`);
    assert.equal(parseOpenGraph(page.html, page.finalUrl).images[0].resolvedUrl, `${base}/nested/image.png`);
  });
  await t.test("reports HTTP failures", async () => {
    await assert.rejects(fetchPage(`${base}/error`), /HTTP 503: Service Unavailable/);
  });
  await t.test("rejects non-HTML content", async () => {
    await assert.rejects(fetchPage(`${base}/json`), /did not return an HTML page/);
  });
  await t.test("times out stalled headers and bodies", async () => {
    await assert.rejects(fetchPage(`${base}/stalled`, undefined, 50), /timed out/);
    await assert.rejects(fetchPage(`${base}/stalled-body`, undefined, 50), /timed out/);
  });
  await t.test("honors caller cancellation", async () => {
    const controller = new AbortController();
    const pending = fetchPage(`${base}/stalled`, controller.signal);
    controller.abort();
    await assert.rejects(pending, { name: "AbortError" });
    await assert.rejects(fetchPage(`${base}/stalled`, controller.signal), { name: "AbortError" });
  });
});
