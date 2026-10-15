import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import {
  DEFAULT_BASE_URL,
  itemLink,
  parseCursor,
  parseSavedSince,
  PondClient,
  validatedBaseUrl,
  validatedTags,
  validatedUrl,
} from "../src/api/client";
import { saveCaption, savedDate, saveTitle } from "../src/save-display";

const save = {
  id: "save-1",
  source: "web",
  url: "https://example.com/article",
  title: "Example",
  description: null,
  author: null,
  tags: ["design"],
  savedAt: 1_760_000_000_000,
};
const cursor = {
  value: 1_760_000_000_000,
  id: "save-1",
  libraryId: "library-1",
  revision: 7,
  sortSignature: "savedAt:desc",
};

function success(data: unknown) {
  return Response.json({ status: "success", data });
}

async function withServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void,
  run: (baseUrl: string) => Promise<void>,
) {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    await run(`http://127.0.0.1:${address.port}/api/v2`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test("only loopback HTTP API endpoints can receive the token", () => {
  assert.equal(validatedBaseUrl(`${DEFAULT_BASE_URL}/`), DEFAULT_BASE_URL);
  assert.equal(validatedBaseUrl("http://[::1]:41610/api/v2"), "http://[::1]:41610/api/v2");
  for (const value of [
    "https://example.com/api/v2",
    "http://example.com/api/v2",
    "https://localhost/api/v2",
    "http://localhost:41610",
    "http://user:pass@localhost/api/v2",
    `${DEFAULT_BASE_URL}?token=x`,
    `${DEFAULT_BASE_URL}#x`,
    "not a URL",
  ]) {
    assert.throws(() => validatedBaseUrl(value));
  }
});

test("uses Pond's default address when the optional API preference is unset", () => {
  assert.equal(new PondClient({ token: "test" }).baseUrl, DEFAULT_BASE_URL);
  assert.equal(new PondClient({ baseUrl: " ", token: "test" }).baseUrl, DEFAULT_BASE_URL);
});

test("accepts complete web URLs and rejects empty, local, and script URLs", () => {
  assert.equal(validatedUrl("  https://example.com/a?q=x#top \n"), "https://example.com/a?q=x#top");
  for (const value of [
    "",
    "example.com",
    "file:///tmp/file",
    "javascript:alert(1)",
    "pond://library",
    "ftp://example.com",
  ]) {
    assert.throws(() => validatedUrl(value), /HTTP or HTTPS/);
  }
});

test("a missing token fails before any network request", async () => {
  const client = new PondClient({ baseUrl: DEFAULT_BASE_URL, fetcher: async () => assert.fail("must not fetch") });
  await assert.rejects(client.libraries(), /Local API Token/);
});

test("sends authenticated enqueue requests to the actual HTTP endpoint and preserves duplicate results", async () => {
  const bodies: string[] = [];
  await withServer(
    (req, res) => {
      assert.equal(req.url, "/api/v2/enqueue");
      assert.equal(req.method, "POST");
      assert.equal(req.headers.authorization, "Bearer test-token");
      assert.equal(req.headers["content-type"], "application/json");
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        bodies.push(body);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "success", data: { id: "save-1", created: bodies.length === 1 } }));
      });
    },
    async (baseUrl) => {
      const client = new PondClient({ baseUrl, token: " test-token " });
      const created = await client.enqueue("https://example.com/article");
      assert.deepEqual(created, { id: "save-1", created: true });
      assert.deepEqual(structuredClone(created), created);
      assert.deepEqual(await client.enqueue("https://example.com/article"), { id: "save-1", created: false });
    },
  );
  assert.deepEqual(JSON.parse(bodies[0]), { url: "https://example.com/article", trigger: "raycast" });
});

test("does not follow redirects or forward credentials to another endpoint", async () => {
  let redirected = false;
  await withServer(
    (req, res) => {
      if (req.url === "/destination") redirected = true;
      res.writeHead(302, { Location: "/destination" });
      res.end();
    },
    async (baseUrl) => {
      await assert.rejects(new PondClient({ baseUrl, token: "test" }).libraries(), /Could not connect/);
    },
  );
  assert.equal(redirected, false);
});

test("search follows Pond's cursor, preserves requested ordering, and omits unrelated response fields", async () => {
  const requests: { path: string; body: unknown }[] = [];
  const client = new PondClient({
    baseUrl: DEFAULT_BASE_URL,
    token: "test",
    fetcher: async (url, init) => {
      const body: unknown = JSON.parse(String(init?.body));
      requests.push({ path: String(url), body });
      if (String(url).endsWith("/library/query")) {
        return success({
          ids: ["save-2", "save-1"],
          total: 3,
          nextCursor: cursor,
          libraryId: "library-1",
          revision: 7,
        });
      }
      return success([
        { ...save, internalPath: "/private/library" },
        { ...save, id: "save-2" },
      ]);
    },
  });
  const page = await client.search({ keywords: "  typography  ", source: "web", cursor });
  assert.deepEqual(
    page.saves.map((item) => item.id),
    ["save-2", "save-1"],
  );
  assert.deepEqual(page.nextCursor, cursor);
  assert.equal(page.saves[0].pondUrl, "pond://item/save-2?library=library-1");
  assert.ok(!("internalPath" in page.saves[1]));
  assert.deepEqual(structuredClone(page), page);
  assert.deepEqual(requests[0].body, {
    query: { combinator: "and", rules: [] },
    keywords: "typography",
    scope: { source: "web" },
    libraryId: "library-1",
    cursor,
    limit: 50,
    sortKey: "savedAt",
    sortDir: "desc",
  });
  assert.deepEqual(requests[1].body, { ids: ["save-2", "save-1"], limit: 2 });
});

test("an empty page retains its continuation cursor without fetching every save", async () => {
  let calls = 0;
  const client = new PondClient({
    baseUrl: DEFAULT_BASE_URL,
    token: "test",
    fetcher: async () => {
      calls++;
      return success({ ids: [], total: 4, nextCursor: cursor, libraryId: "library-1", revision: 7 });
    },
  });
  const page = await client.search();
  assert.deepEqual(page.saves, []);
  assert.deepEqual(page.nextCursor, cursor);
  assert.equal(calls, 1);
});

test("handles saves removed between query and hydration", async () => {
  const client = new PondClient({
    baseUrl: DEFAULT_BASE_URL,
    token: "test",
    fetcher: async (url) => {
      return String(url).endsWith("/library/query")
        ? success({ ids: ["missing", "save-1"], total: 2, nextCursor: null, libraryId: "library-1", revision: 7 })
        : success([save]);
    },
  });
  assert.deepEqual(
    (await client.search()).saves.map((item) => item.id),
    ["save-1"],
  );
});

for (const status of [401, 403]) {
  test(`HTTP ${status} gives token setup guidance`, async () => {
    const client = new PondClient({
      baseUrl: DEFAULT_BASE_URL,
      token: "bad",
      fetcher: async () => new Response("no", { status }),
    });
    await assert.rejects(client.libraries(), /fresh Local API Token/);
  });
}

test("preserves server errors such as stale pagination cursors", async () => {
  const client = new PondClient({
    baseUrl: DEFAULT_BASE_URL,
    token: "test",
    fetcher: async () =>
      Response.json(
        { status: "error", error: "The library changed. Refresh the search before loading more results." },
        { status: 500 },
      ),
  });
  await assert.rejects(client.search({ cursor }), /Refresh the search/);
});

test("rejects malformed success payloads instead of claiming a successful save", async () => {
  for (const payload of [{ status: "success", data: { id: "x" } }, { data: { id: "x", created: true } }, null]) {
    const client = new PondClient({
      baseUrl: DEFAULT_BASE_URL,
      token: "test",
      fetcher: async () => Response.json(payload),
    });
    await assert.rejects(client.enqueue(save.url), /unexpected response/);
  }
});

test("does not retry a save after a timeout that might have happened after acceptance", async () => {
  let calls = 0;
  const client = new PondClient({
    baseUrl: DEFAULT_BASE_URL,
    token: "test",
    fetcher: async (_url, init) => {
      calls++;
      assert.ok(init?.signal);
      assert.equal(init.redirect, "error");
      throw new DOMException("timeout", "TimeoutError");
    },
  });
  await assert.rejects(client.enqueue(save.url), /Check Pond before trying again/);
  assert.equal(calls, 1);
});

test("lists recent libraries including unavailable entries and switches by exact path", async () => {
  const library = {
    path: "/Volumes/Archive/My Library",
    name: "My Library",
    active: false,
    available: false,
    lastOpened: 123,
    icon: null,
    accent: null,
  };
  const client = new PondClient({
    baseUrl: DEFAULT_BASE_URL,
    token: "test",
    fetcher: async (url, init) => {
      if (String(url).endsWith("/library/recent")) return success([library]);
      assert.equal(String(url), `${DEFAULT_BASE_URL}/library/switch`);
      assert.deepEqual(JSON.parse(String(init?.body)), { path: library.path });
      return success({ ok: true, path: library.path });
    },
  });
  assert.deepEqual(await client.libraries(), [library]);
  assert.deepEqual(await client.switchLibrary(library.path), { ok: true, path: library.path });
});

test("thumbnails require authentication, encode IDs, and allow missing covers", async () => {
  const client = new PondClient({
    baseUrl: DEFAULT_BASE_URL,
    token: "test",
    fetcher: async (url, init) => {
      assert.equal(String(url), `${DEFAULT_BASE_URL}/saves/thumb?id=save%20%231`);
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test");
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/png; charset=binary" } });
    },
  });
  assert.deepEqual(await client.thumbnail("save #1"), { bytes: new Uint8Array([1, 2, 3]), extension: "png" });
  const missing = new PondClient({
    baseUrl: DEFAULT_BASE_URL,
    token: "test",
    fetcher: async () => new Response(null, { status: 404 }),
  });
  assert.equal(await missing.thumbnail("save-1"), null);
});

test("cursor serialization and Pond links preserve special characters", () => {
  assert.deepEqual(parseCursor(JSON.stringify(cursor)), cursor);
  assert.equal(parseCursor(), null);
  assert.throws(() => parseCursor("{}"), /Invalid search cursor/);
  assert.throws(() => parseCursor("garbage"), /Invalid search cursor/);
  const link = new URL(itemLink("library & 1", "save/#1"));
  assert.equal(link.pathname, "/save%2F%231");
  assert.equal(link.searchParams.get("library"), "library & 1");
});

test("display handles untitled saves, literal markdown, and invalid dates", () => {
  assert.equal(saveTitle({ ...save, title: null, description: null }), "example.com");
  assert.equal(
    saveCaption({ ...save, description: "![track](https://example.com)" }),
    "\\!\\[track\\]\\(https://example\\.com\\)",
  );
  assert.equal(savedDate("not-a-date"), "Unknown");
});

test("tagged saves send trimmed unique tags and preserve duplicate outcomes", async () => {
  const client = new PondClient({
    token: "test",
    fetcher: async (_url, init) => {
      assert.deepEqual(JSON.parse(String(init?.body)), {
        url: save.url,
        trigger: "raycast",
        tags: ["design", "inspiration"],
      });
      return success({ id: save.id, created: false });
    },
  });
  assert.deepEqual(await client.enqueue(save.url, [" design ", "inspiration", "design"]), {
    id: save.id,
    created: false,
  });
  assert.throws(() => validatedTags([""]), /non-empty/);
  assert.throws(() => validatedTags(Array.from({ length: 101 }, (_, i) => `tag-${i}`)), /100/);
});

test("date filters validate real ISO dates and preserve timezone offsets", () => {
  assert.equal(parseSavedSince("2026-10-01"), Date.UTC(2026, 9, 1));
  assert.equal(parseSavedSince("2026-10-01T09:00:00+05:30"), Date.UTC(2026, 9, 1, 3, 30));
  assert.equal(parseSavedSince(), undefined);
  for (const value of ["last week", "2026-02-30", "2026-10-01T09:00:00", "1960-01-01"]) {
    assert.throws(() => parseSavedSince(value));
  }
});

test("combines keyword, source, tag, and date filters in Pond's query scope", async () => {
  const client = new PondClient({
    token: "test",
    fetcher: async (_url, init) => {
      assert.deepEqual(JSON.parse(String(init?.body)), {
        query: { combinator: "and", rules: [] },
        keywords: "type",
        scope: { source: "web", tag: "design", savedSince: 123 },
        cursor: null,
        limit: 50,
        sortKey: "savedAt",
        sortDir: "desc",
      });
      return success({ ids: [], total: 0, nextCursor: null, libraryId: "library-1", revision: 1 });
    },
  });
  await client.search({ keywords: "type", source: "web", tag: "design", savedSince: 123 });
});

test("get-save pins the originating library and selects the exact save", async () => {
  const client = new PondClient({
    token: "test",
    fetcher: async (url, init) => {
      if (String(url).endsWith("/library/query")) {
        const body = JSON.parse(String(init?.body));
        assert.equal(body.libraryId, "library-1");
        assert.deepEqual(body.scope, { saveIds: [save.id] });
        assert.equal(body.limit, 1);
        return success({ ids: [save.id], total: 1, nextCursor: null, libraryId: "library-1", revision: 1 });
      }
      return success([{ ...save, privateField: "omit me" }]);
    },
  });
  const result = await client.getSave({ id: save.id, libraryId: "library-1" });
  assert.equal(result.pondUrl, "pond://item/save-1?library=library-1");
  assert.ok(!("privateField" in result));
  assert.deepEqual(structuredClone(result), result);
});

test("missing or stale save references fail instead of opening unrelated saves", async () => {
  const client = new PondClient({
    token: "test",
    fetcher: async () => success({ ids: [], total: 0, nextCursor: null, libraryId: "library-1", revision: 1 }),
  });
  await assert.rejects(client.getSave({ id: "missing", libraryId: "library-1" }), /no longer/);
  await assert.rejects(client.getSave({ id: "", libraryId: "library-1" }), /save ID/);
  await assert.rejects(client.search({ cursor, libraryId: "library-2" }), /another library/);
});

test("library info exposes only the name, path, and save count", async () => {
  const client = new PondClient({
    token: "test",
    fetcher: async (url) => {
      assert.equal(String(url), `${DEFAULT_BASE_URL}/library/info`);
      return success({
        name: "Design",
        path: "/Libraries/Design",
        counts: { active: 42 },
        theme: { private: "unused" },
      });
    },
  });
  const result = await client.libraryInfo();
  assert.deepEqual(result, { name: "Design", path: "/Libraries/Design", counts: { active: 42 } });
  assert.deepEqual(structuredClone(result), result);
});

test("connection checks read Pond's version through the app info endpoint", async () => {
  const client = new PondClient({
    token: "test",
    fetcher: async (url) => {
      assert.equal(String(url), `${DEFAULT_BASE_URL}/app/info`);
      return success({ name: "pond", version: "1.0.1", platform: "darwin", arch: "arm64" });
    },
  });
  assert.equal((await client.appInfo()).version, "1.0.1");
});

test("switch-library rejects invented and unavailable paths and skips an already active library", async () => {
  const active = {
    path: "/Libraries/A",
    name: "A",
    active: true,
    available: true,
    lastOpened: 123,
    icon: null,
    accent: null,
  };
  const unavailable = { ...active, path: "/Volumes/B", name: "B", active: false, available: false };
  const client = new PondClient({
    token: "test",
    fetcher: async (url) => {
      assert.ok(String(url).endsWith("/library/recent"), "must not switch");
      return success([active, unavailable]);
    },
  });
  assert.deepEqual(await client.selectLibrary(active.path), { path: active.path, name: "A", alreadyActive: true });
  await assert.rejects(client.selectLibrary("/invented"), /exact path/);
  await assert.rejects(client.selectLibrary(unavailable.path), /unavailable/);
});

test("switch-library checks the recent list before switching to the selected available path", async () => {
  const library = {
    path: "/Libraries/B",
    name: "B",
    active: false,
    available: true,
    lastOpened: 123,
    icon: null,
    accent: null,
  };
  const paths: string[] = [];
  const client = new PondClient({
    token: "test",
    fetcher: async (url, init) => {
      paths.push(String(url));
      if (String(url).endsWith("/library/recent")) return success([library]);
      assert.deepEqual(JSON.parse(String(init?.body)), { path: library.path });
      return success({ ok: true, path: library.path });
    },
  });
  assert.deepEqual(await client.selectLibrary(library.path), { path: library.path, name: "B", alreadyActive: false });
  assert.equal(paths.length, 2);
});

test("copy-file uses the preview token with identical arguments", async () => {
  const requests: string[] = [];
  const client = new PondClient({
    token: "test",
    fetcher: async (url, init) => {
      requests.push(String(url));
      const body = JSON.parse(String(init?.body));
      assert.equal(body.operation, "saves.copyFile");
      assert.deepEqual(body.arguments, { id: save.id, fileIndex: 0 });
      if (String(url).endsWith("/preview"))
        return success({
          token: "preview-test",
          operation: "saves.copyFile",
          libraryId: "library-1",
          expiresAt: Date.now() + 1000,
        });
      assert.equal(body.token, "preview-test");
      return success({ ok: true });
    },
  });
  assert.deepEqual(await client.copySaveFile({ id: save.id, libraryId: "library-1" }), { ok: true });
  assert.equal(requests.length, 2);
});

test("copy-file does not run when the active library changed", async () => {
  let calls = 0;
  const client = new PondClient({
    token: "test",
    fetcher: async () => {
      calls++;
      return success({
        token: "preview-test",
        operation: "saves.copyFile",
        libraryId: "another-library",
        expiresAt: Date.now() + 1000,
      });
    },
  });
  await assert.rejects(client.copySaveFile({ id: save.id, libraryId: "library-1" }), /active library changed/);
  assert.equal(calls, 1);
});

test("copy-file reports missing files without claiming success", async () => {
  const client = new PondClient({
    token: "test",
    fetcher: async (url) =>
      String(url).endsWith("/preview")
        ? success({
            token: "preview-test",
            operation: "saves.copyFile",
            libraryId: "library-1",
            expiresAt: Date.now() + 1000,
          })
        : Response.json({ status: "error", error: "no_files" }, { status: 500 }),
  });
  await assert.rejects(client.copySaveFile({ id: save.id, libraryId: "library-1" }), /no file to copy/);
});
