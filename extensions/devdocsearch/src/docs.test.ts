import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { buildIndex, coveredDrizzleAliases, coveredSavedAliases, crawlDocs, extractPage, normalizeUrl, searchPages, type SavedPage } from "./docs";

test("normalizes in-scope URLs and rejects other hosts or paths", () => {
  const root = new URL("https://example.com/docs/");
  assert.equal(normalizeUrl("../docs/api/#top", root, root), "https://example.com/docs/api/");
  assert.equal(normalizeUrl("https://elsewhere.test/docs", root, root), null);
  assert.equal(normalizeUrl("https://example.com/blog", root, root), null);
  assert.equal(normalizeUrl("https://example.com/docs/file.pdf", root, root), null);
});

test("accepts a docs root redirect that only removes its trailing slash", () => {
  const root = new URL("https://example.com/api/docs/");
  assert.equal(normalizeUrl("https://example.com/api/docs", root, root), "https://example.com/api/docs");
  assert.equal(normalizeUrl("https://example.com/api", root, root), null);
});

test("saves a same-origin documentation migration without crawling beyond the selected path", async () => {
  const root = "https://example.com/api/docs/";
  const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    const response = new Response(url.endsWith("llms.txt") ? "Not found" : url.endsWith("/old")
      ? "<main><h1>Reference</h1><p>Read the migrated reference.</p><a href='/api/reference/other'>Outside</a></main>"
      : "<main><h1>Docs</h1><p>Read the docs.</p><a href='/api/docs/old'>Old</a></main>",
      { status: url.endsWith("llms.txt") ? 404 : 200, headers: { "content-type": "text/html" } });
    Object.defineProperty(response, "url", { value: url.endsWith("/old") ? "https://example.com/api/reference/new" : url.endsWith("llms.txt") ? url : "https://example.com/api/docs" });
    return response;
  });
  try {
    const result = await crawlDocs(root);
    assert.equal(result.pageCount, 2);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.skipped, []);
    assert.ok(result.pages.some(({ url }) => url === "https://example.com/api/reference/new"));
    assert.equal(fetchMock.mock.calls.some((call) => String(call.arguments[0]) === "https://example.com/api/reference/other"), false);
  } finally { fetchMock.mock.restore(); }
});

test("rejects a root redirect outside the requested documentation path", async () => {
  const root = "https://example.com/api/docs/";
  const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    const response = new Response("<main><h1>Elsewhere</h1></main>", { headers: { "content-type": "text/html" } });
    Object.defineProperty(response, "url", { value: url.endsWith("llms.txt") ? url : "https://example.com/blog" });
    return response;
  });
  try {
    const result = await crawlDocs(root);
    assert.equal(result.pageCount, 0);
    assert.deepEqual(result.errors, [`${root}: Redirected outside the documentation URL's scope.`]);
  } finally { fetchMock.mock.restore(); }
});

test("an external redirect from a child link is skipped without discarding the collection", async () => {
  const root = "https://example.com/docs";
  const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    const response = new Response(url.endsWith("llms.txt") ? "Not found"
      : "<main><h1>Docs</h1><p>Useful documentation.</p><a href='/docs/old'>Old</a></main>",
    { status: url.endsWith("llms.txt") ? 404 : 200, headers: { "content-type": "text/html" } });
    Object.defineProperty(response, "url", { value: url.endsWith("/old") ? "https://other.test/new" : url });
    return response;
  });
  try {
    const result = await crawlDocs(root);
    assert.equal(result.pageCount, 1);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.skipped, [`${root}/old: redirected outside the documentation URL's scope`]);
  } finally { fetchMock.mock.restore(); }
});

test("Markdown discovery ignores code and image links while following documentation links", async () => {
  const root = "https://example.com/docs/";
  const requested: string[] = [];
  const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    requested.push(url);
    const response = url.endsWith("llms.txt")
      ? new Response("[Guide](/docs/guide.md)")
      : url.endsWith("guide.md")
        ? new Response("# Guide\n\n[Next](<https://example.com/docs/next>)\n\n![Image](<https://example.com/docs/picture.webp>)\n\n```text\n[code](model=[tool])\n```", { headers: { "content-type": "text/markdown" } })
        : new Response("<main><h1>Docs</h1><p>Documentation.</p></main>", { headers: { "content-type": "text/html" } });
    Object.defineProperty(response, "url", { value: url });
    return response;
  });
  try {
    const result = await crawlDocs(root);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.skipped, []);
    assert.ok(requested.includes("https://example.com/docs/next"));
    assert.equal(requested.some((url) => url.includes("picture.webp") || url.includes("model=")), false);
  } finally { fetchMock.mock.restore(); }
});

test("extracts content and child links without navigation text", () => {
  const html = `<html><head><title>API | Site</title></head><body><nav>Navigation</nav><main><h1>API</h1><p>Use the <code>client</code>.</p><a href="/docs/api/auth">Auth</a></main><footer>Footer</footer></body></html>`;
  const page = extractPage(html, "https://example.com/docs/api", new URL("https://example.com/docs/"));
  assert.equal(page.title, "API");
  assert.match(page.markdown, /Use the `client`/);
  assert.doesNotMatch(page.markdown, /Navigation|Footer/);
  assert.deepEqual(page.links, ["https://example.com/docs/api/auth"]);
});

test("preserves separate syntax highlighted code lines for copying", () => {
  const html = `<main><h1>Install</h1><pre><code><span class="line"><span>npm</span> install tailwindcss</span><span class="line"><span>npm</span> run dev</span></code></pre></main>`;
  const page = extractPage(html, "https://example.com/docs/install", new URL("https://example.com/docs"));
  assert.match(page.markdown, /npm install tailwindcss\nnpm run dev/);
});

test("uses the heading section when a site omits main and article tags", () => {
  const html = `<body><nav>Navigation link</nav><div><div><h1>Install</h1><p>${"Install Tailwind with Vite. ".repeat(8)}</p><pre>npm install tailwindcss</pre></div></div><footer>Marketing footer</footer></body>`;
  const page = extractPage(html, "https://example.com/docs/install", new URL("https://example.com/docs"));
  assert.match(page.markdown, /Install Tailwind with Vite/);
  assert.doesNotMatch(page.markdown, /Navigation link|Marketing footer/);
});

test("search ranks title matches and returns a contextual excerpt", () => {
  const pages: SavedPage[] = [
    { url: "https://example.com/docs/one", title: "Authorization", markdown: "# Authorization\n\nUse a token to sign in.", fetchedAt: "2026-01-01" },
    { url: "https://example.com/docs/two", title: "Setup", markdown: "# Setup\n\nAuthorization uses a token.", fetchedAt: "2026-01-01" },
  ];
  const results = searchPages(pages, "authorization");
  assert.equal(results[0]?.page.title, "Authorization");
  assert.match(results[1]?.excerpt ?? "", /Authorization/);
  assert.equal(searchPages(pages, "missing").length, 0);
  assert.equal(searchPages(pages, "How do I implement authorization with a token?")[0]?.page.title, "Authorization");
  const index = buildIndex(pages);
  assert.equal(searchPages(pages, "authorization", index)[0]?.page.title, "Authorization");
  assert.deepEqual(searchPages(pages, "missing", index), []);
  assert.equal(buildIndex([{ url: "https://example.com/constructor", title: "Constructor", markdown: "constructor prototype", fetchedAt: "2026-01-01" }])["constructor"]?.[0]?.[0], 0);
});

test("a broken child link is reported without failing the other downloaded pages", async () => {
  const root = "https://example.com/docs/";
  const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    const response = url.endsWith("llms.txt") || url.endsWith("/missing")
      ? new Response("Not found", { status: 404 })
      : url.endsWith("/gone")
        ? new Response("Gone", { status: 410 })
      : url.endsWith("/server-error")
        ? new Response("Unavailable", { status: 503 })
        : new Response(url === root
          ? '<main><h1>Docs</h1><p>Welcome to the docs.</p><a href="/docs/good">Good</a><a href="/docs/missing">Missing</a><a href="/docs/gone">Gone</a><a href="/docs/server-error">Server error</a></main>'
          : '<main><h1>Good</h1><p>A usable saved page.</p></main>', { headers: { "content-type": "text/html" } });
    Object.defineProperty(response, "url", { value: url });
    return response;
  });
  try {
    const result = await crawlDocs(root);
    assert.equal(result.pageCount, 2);
    assert.deepEqual(result.skipped, [`${root}missing: HTTP 404`, `${root}gone: HTTP 410`]);
    assert.deepEqual(result.errors, [`${root}server-error: HTTP 503`]);
  } finally { fetchMock.mock.restore(); }
});

test("Drizzle's broken pg alias is covered when the canonical page was saved", () => {
  assert.deepEqual(coveredDrizzleAliases([
    "https://orm.drizzle.team/docs/pg/overview: HTTP 404",
    "https://orm.drizzle.team/docs/pg/missing: HTTP 404",
  ], new Set(["https://orm.drizzle.team/docs/overview"])), ["https://orm.drizzle.team/docs/pg/missing: HTTP 404"]);
});

test("tRPC's stale llms.txt routes are covered only by saved current pages", () => {
  const root = "https://trpc.io/docs";
  const aliases = [
    ["/client/links/overview", "/client/links"],
    ["/client/nextjs/app-router/server-actions", "/client/nextjs/server-actions"],
    ["/client/nextjs/app-router/setup", "/client/nextjs/app-router-setup"],
    ["/client/nextjs/overview", "/client/nextjs"],
    ["/client/openapi", "/openapi"],
    ["/client/overview", "/v10/client"],
    ["/client/react/overview", "/client/react"],
    ["/client/tanstack-react-query/overview", "/client/tanstack-react-query"],
    ["/client/vanilla/overview", "/client/vanilla"],
    ["/further/faq", "/faq"],
    ["/further/further-reading", "/further-reading"],
    ["/further/rpc", "/rpc"],
    ["/main/concepts", "/concepts"],
    ["/main/example-apps", "/example-apps"],
    ["/main/introduction", ""],
    ["/main/quickstart", "/quickstart"],
    ["/main/skills", "/skills"],
    ["/main/videos-and-community-resources", "/videos-and-community-resources"],
    ["/migration/migrate-from-v10-to-v11", "/migrate-from-v10-to-v11"],
    ["/links/localLink", "/client/links/localLink"],
  ];
  const saved = new Set(aliases.map(([, current]) => root + current));
  const skipped = aliases.map(([old]) => `${root}${old}: HTTP 404`);
  assert.deepEqual(coveredSavedAliases(skipped, saved), []);
  assert.deepEqual(coveredSavedAliases(skipped, new Set([root])), skipped.filter((entry) => !entry.startsWith(`${root}/main/introduction:`)));
  assert.deepEqual(coveredSavedAliases(["https://example.com/docs/client/overview: HTTP 404"], saved), ["https://example.com/docs/client/overview: HTTP 404"]);
});

test("a docs root with a missing trailing-slash page uses the canonical page and origin index", async () => {
  const root = "https://example.com/docs/";
  const requested: string[] = [];
  const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    requested.push(url);
    let response: Response;
    let finalUrl = url;
    if (url === `${root}llms.txt` || url === root) response = new Response("Not found", { status: 404 });
    else if (url === "https://example.com/llms.txt") response = new Response("[Indexed page](/docs/indexed)");
    else if (url === "https://example.com/docs") {
      finalUrl = `${root}overview`;
      response = new Response("<main><h1>Overview</h1><p>Read the overview.</p></main>", { headers: { "content-type": "text/html" } });
    } else response = new Response("<main><h1>Indexed</h1><p>Found through llms.txt.</p></main>", { headers: { "content-type": "text/html" } });
    Object.defineProperty(response, "url", { value: finalUrl });
    return response;
  });
  try {
    const result = await crawlDocs(root);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.pages.map((page) => page.url).sort(), [`${root}indexed`, `${root}overview`]);
    assert.ok(requested.includes("https://example.com/docs"));
    assert.ok(requested.includes("https://example.com/llms.txt"));
  } finally { fetchMock.mock.restore(); }
});

test("a temporary page timeout is retried before publishing the crawl", async () => {
  const root = "https://example.com/docs/";
  let childAttempts = 0;
  const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("llms.txt")) return new Response("Not found", { status: 404 });
    if (url.endsWith("/child") && ++childAttempts === 1) throw new DOMException("Timed out", "TimeoutError");
    const response = new Response(url === root
      ? '<main><h1>Docs</h1><p>Welcome.</p><a href="/docs/child">Child</a></main>'
      : '<main><h1>Child</h1><p>Recovered after retry.</p></main>', { headers: { "content-type": "text/html" } });
    Object.defineProperty(response, "url", { value: url });
    return response;
  });
  try {
    const result = await crawlDocs(root);
    assert.equal(childAttempts, 2);
    assert.equal(result.pageCount, 2);
    assert.deepEqual(result.errors, []);
  } finally { fetchMock.mock.restore(); }
});


test("checks every page and index redirect before contacting another origin", async () => {
  const forbidden: string[] = [];
  const outside = createServer((request, response) => {
    forbidden.push(request.url || "");
    response.writeHead(200, { "content-type": "text/html" });
    response.end("<main><h1>Outside</h1></main>");
  }).listen(0, "127.0.0.1");
  await once(outside, "listening");
  const address = outside.address();
  assert.ok(address && typeof address !== "string");
  const external = `http://127.0.0.1:${address.port}`;
  const visited: string[] = [];
  const server = createServer((request, response) => {
    const path = request.url || "/";
    visited.push(path);
    if (path.endsWith("llms.txt")) response.writeHead(302, { location: "/index-hop" }).end();
    else if (path === "/index-hop") response.writeHead(307, { location: `${external}/index` }).end();
    else if (path === "/docs/escape") response.writeHead(301, { location: "/docs/hop" }).end();
    else if (path === "/docs/hop") response.writeHead(308, { location: `${external}/page` }).end();
    else if (path === "/docs/old") response.writeHead(302, { location: "/reference/new" }).end();
    else {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(path === "/docs/"
        ? '<main><h1>Docs</h1><p>Useful docs.</p><a href="/docs/escape">Escape</a><a href="/docs/old">Old</a></main>'
        : '<main><h1>Reference</h1><p>Migrated docs.</p><a href="/reference/other">Other</a></main>');
    }
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const local = server.address();
  assert.ok(local && typeof local !== "string");
  try {
    const result = await crawlDocs(`http://127.0.0.1:${local.port}/docs/`);
    assert.deepEqual(forbidden, [], "out-of-origin redirects must never receive a request");
    assert.equal(result.pageCount, 2);
    assert.deepEqual(result.errors, []);
    assert.equal(result.skipped.length, 1);
    assert.ok(visited.includes("/reference/new"), "preserve same-origin child migrations");
    assert.ok(!visited.includes("/reference/other"), "keep link discovery in the selected path");
  } finally {
    server.closeAllConnections(); outside.closeAllConnections();
    await Promise.all([new Promise<void>((resolve) => server.close(() => resolve())), new Promise<void>((resolve) => outside.close(() => resolve()))]);
  }
});
