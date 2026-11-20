import assert from "node:assert/strict";
import test from "node:test";
import { CodePenClient, CodePenError, apiURL, nextLink, pensPath, validatePenDetails } from "../src/lib/client";
import { buildIssueLines, buildMessage, isBuildPending } from "../src/lib/models";

const build = {
  id: "version-1",
  version_id: "version-1",
  status: "Success",
  next_id: null,
  diagnostics: [],
  errors: [],
};
const version = {
  id: "version-1",
  created_at: "2026-10-01T10:00:00Z",
  deployed: false,
  build,
  preview_url: "https://pv-example.codepen.dev/",
};
const file = {
  id: "file-1",
  path: "/index.html",
  name: "index.html",
  is_binary: false,
  content: "<h1>Hello</h1>",
  url: "https://example.codepenusercontent.com/index.html",
};
const pen = {
  id: "pen-1",
  title: "Hello",
  description: "A demo",
  tags: ["demo"],
  access: "Private",
  template: false,
  editor: "V2",
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:00:00Z",
  urls: { editor: "https://codepen.io/editor/me/pen/pen-1", preview: "https://example.codepen.dev/" },
  saved_version: version,
  deployment: null,
};
const asset = {
  id: "asset-1",
  filename: "logo.png",
  url: "https://assets.codepen.io/1/logo.png",
  is_binary: true,
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:00:00Z",
};
type Call = { url: string; options?: RequestInit };
function fixture(responses: Response[]) {
  const calls: Call[] = [];
  const fetcher: typeof fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    const response = responses.shift();
    assert.ok(response, "Unexpected extra request");
    return response;
  };
  return { client: new CodePenClient("cp_user_test-only", fetcher), calls };
}
const json = (body: unknown, status = 200, headers?: HeadersInit) => Response.json(body, { status, headers });
function body(call: Call) {
  assert.equal(typeof call.options?.body, "string");
  return JSON.parse(String(call.options?.body));
}

test("server-side search preserves web syntax, filters, and encoded characters", () => {
  const url = apiURL(pensPath({ search: '"css grid" -old & new', filter: "templates" }));
  assert.equal(url.searchParams.get("search_term"), '"css grid" -old & new');
  assert.equal(url.searchParams.get("template"), "true");
  assert.equal(url.searchParams.get("sort"), "updated");
  assert.throws(() => pensPath({ search: "x".repeat(201) }), /200/);
});

test("pagination follows the full next link, even after an empty page", async () => {
  const next = "https://api.codepen.io/v2/pens?page=2&search_term=hello&editor=V2";
  const { client, calls } = fixture([
    json([], 200, { link: `<${next}>; rel="next", <https://api.codepen.io/v2/pens?page=2>; rel="last"` }),
    json([pen]),
  ]);
  const first = await client.listPens({ search: "hello", filter: "V2" });
  assert.equal(first.next, next);
  assert.deepEqual(first.data, []);
  const second = await client.listPens(undefined, first.next ?? undefined);
  assert.equal(calls[1].url, next);
  assert.equal(second.data[0].id, "pen-1");
  assert.equal(second.next, null);
  assert.equal(new Headers(calls[0].options?.headers).get("Authorization"), "Bearer cp_user_test-only");
  assert.equal(calls[0].options?.redirect, "error");
});

test("API keys cannot be forwarded through foreign or escaped pagination URLs", async () => {
  for (const url of [
    "https://attacker.invalid/v2/pens",
    "https://api.codepen.io/v2/../../pens",
    "https://user:pass@api.codepen.io/v2/pens",
    "http://api.codepen.io/v2/pens",
  ]) {
    assert.throws(() => apiURL(url), /Invalid CodePen API URL/);
    assert.throws(() => nextLink(`<${url}>; rel="next"`), /Invalid CodePen API URL/);
  }
  const { client, calls } = fixture([]);
  await assert.rejects(() => client.listPens(undefined, "https://attacker.invalid/v2/pens"));
  assert.equal(calls.length, 0);
});

test("HTTP errors preserve API messages and provide authentication and allowance guidance", async () => {
  for (const [status, code, message, expected] of [
    [401, "UNAUTHENTICATED", "Invalid key", /API key/],
    [403, "FORBIDDEN", "Requires PRO", /Requires PRO/],
    [429, "RATE_LIMITED", "Daily create limit reached", /allowance resets/],
    [409, "CONFLICT", "Head changed", /Head changed/],
  ] as const) {
    const { client } = fixture([json({ code, message }, status)]);
    await assert.rejects(
      () => client.listPens(),
      (error: unknown) =>
        error instanceof CodePenError && error.status === status && error.code === code && expected.test(error.message),
    );
  }
});

test("malformed successful write responses warn that the operation already succeeded", async () => {
  const { client, calls } = fixture([json({ id: "created-but-unreadable" }, 201)]);
  await assert.rejects(() => client.createPen({ title: "Hello" }), /accepted the request.*before repeating/);
  assert.equal(calls.length, 1);
});

test("interrupted writes are never retried automatically", async () => {
  let requests = 0;
  const fetcher: typeof fetch = async () => {
    requests++;
    throw new Error("timeout");
  };
  await assert.rejects(
    () => new CodePenClient("cp_user_test", fetcher).createPen({ title: "Hello" }),
    /may have succeeded/,
  );
  assert.equal(requests, 1);
});

test("creating with account defaults omits privacy and files, and failed builds remain successful writes", async () => {
  const { client, calls } = fixture([
    json(
      {
        ...pen,
        build: { ...build, status: "Failed", errors: [{ type: "Error", message: "Invalid CSS", path: "/style.css" }] },
      },
      201,
    ),
  ]);
  const created = await client.createPen({ title: "Hello" });
  assert.equal("access" in body(calls[0]), false);
  assert.equal("files" in body(calls[0]), false);
  assert.equal(body(calls[0]).wait, 45);
  assert.equal(created.build.status, "Failed");
  assert.match(buildMessage(created.build), /Files saved, but the build failed/);
  assert.deepEqual(structuredClone(created), created);
});

test("Protected creation and forks require a new password without silently changing privacy", async () => {
  assert.throws(() => validatePenDetails({ title: "Secret", access: "Protected" }), /password/);
  assert.throws(() => validatePenDetails({ title: "Secret", access: "Protected", password: "short" }));
  assert.throws(
    () => validatePenDetails({ title: "Public", access: "Public", password: "long-password" }),
    /only supported/,
  );
  const { client, calls } = fixture([json({ ...pen, access: "Protected" })]);
  await assert.rejects(() => client.forkPen("pen-1", { title: "Fork", access: "Protected" }), /password/);
  assert.equal(calls.length, 1);
});

test("Classic snapshots read converted files and never request nonexistent versions", async () => {
  const classic = { ...pen, editor: "Classic", saved_version: null };
  const { client, calls } = fixture([json(classic), json([{ ...file, url: null }])]);
  const snapshot = await client.snapshot("pen-1");
  assert.equal(snapshot.version, null);
  assert.equal(snapshot.files[0].content, file.content);
  assert.equal(calls[1].url, "https://api.codepen.io/v2/pens/pen-1/files");
});

test("pen updates omit fields that were not changed so newer server values stay in place", async () => {
  const { client, calls } = fixture([json(pen), json({ ...pen, description: "Edited" })]);
  const updated = await client.updatePen("pen-1", { description: "Edited" });
  assert.equal(calls[0].options?.method, "GET");
  assert.equal(calls[1].options?.method, "PATCH");
  assert.deepEqual(body(calls[1]), { description: "Edited" });
  assert.equal(updated.description, "Edited");
});

test("collection updates omit fields that were not changed and new collections still require a title", async () => {
  const collection = {
    id: "collection-1",
    title: "Ideas",
    description: "A group",
    access: "Public",
    items_count: 1,
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
    url: "https://codepen.io/collection/ideas",
  };
  const { client, calls } = fixture([json({ ...collection, description: "Edited" })]);
  await client.saveCollection({ description: "Edited" }, collection.id);
  assert.equal(calls[0].options?.method, "PATCH");
  assert.deepEqual(body(calls[0]), { description: "Edited" });
  const creating = fixture([]);
  assert.throws(() => creating.client.saveCollection({ description: "No title" }));
  assert.equal(creating.calls.length, 0);
});

test("changing to Protected requires a password while existing Protected passwords can be retained or rotated", async () => {
  const changing = fixture([json(pen)]);
  await assert.rejects(() => changing.client.updatePen("pen-1", { title: "Secret", access: "Protected" }), /password/);
  assert.equal(changing.calls.length, 1);

  const protectedPen = { ...pen, access: "Protected" };
  const { client, calls } = fixture([json(protectedPen), json(protectedPen), json(protectedPen), json(protectedPen)]);
  await client.updatePen("pen-1", { title: "Keep password", access: "Protected" });
  assert.equal("password" in body(calls[1]), false);
  await client.updatePen("pen-1", { title: "Rotate password", password: "new-password" });
  assert.equal(body(calls[3]).password, "new-password");
  assert.equal("access" in body(calls[3]), false);
});

test("Classic writes are blocked before any mutation request", async () => {
  const { client, calls } = fixture([json({ ...pen, editor: "Classic", saved_version: null })]);
  await assert.rejects(
    () => client.writeFiles("pen-1", "version-1", [{ path: "/index.html", content: "new" }]),
    /read-only/,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options?.method, "GET");
});

test("snapshot pins source content to the version read, avoiding head/file races", async () => {
  const { client, calls } = fixture([json(pen), json({ ...version, files: [file] })]);
  const snapshot = await client.snapshot("pen-1");
  assert.equal(calls[1].url, "https://api.codepen.io/v2/versions/version-1");
  assert.equal(snapshot.version?.id, "version-1");
  assert.equal(snapshot.files[0].content, file.content);
});

test("stale edits and unsettled compiler builds cannot be written", async () => {
  const stale = fixture([json(pen)]);
  await assert.rejects(
    () => stale.client.writeFiles("pen-1", "old-version", [{ path: "/index.html", content: "new" }]),
    (error: unknown) => error instanceof CodePenError && error.code === "CONFLICT",
  );
  assert.equal(stale.calls.length, 1);
  for (const state of [
    { status: "Running", next_id: null },
    { status: "Queued", next_id: null },
    { status: "Canceled", next_id: "version-2" },
  ]) {
    const { client, calls } = fixture([json({ ...pen, saved_version: { ...version, build: { ...build, ...state } } })]);
    await assert.rejects(
      () => client.writeFiles("pen-1", "version-1", [{ path: "/index.html", content: "new" }]),
      /still running/,
    );
    assert.equal(calls.length, 1);
  }
});

test("file writes carry the expected version and return compiler-adjusted source", async () => {
  const newBuild = { ...build, id: "version-2", version_id: "version-2" };
  const newVersion = {
    ...version,
    id: "version-2",
    build: newBuild,
    files: [{ ...file, content: "<h1>Formatted</h1>\n" }],
  };
  const { client, calls } = fixture([
    json(pen),
    json({ pen: { ...pen, saved_version: newVersion }, version: newVersion, build: newBuild }),
  ]);
  const result = await client.writeFiles("pen-1", "version-1", [
    { path: "/index.html", content: "<h1>Formatted</h1>" },
  ]);
  assert.equal(body(calls[1]).expected_version_id, "version-1");
  assert.equal(result.version.files[0].content, "<h1>Formatted</h1>\n");
  assert.equal(calls.filter((call) => call.options?.method === "PUT").length, 1);
  assert.deepEqual(structuredClone(result), result);
});

test("failed builds show errors and diagnostics without repeating identical issues", () => {
  const failed = {
    ...build,
    status: "Failed" as const,
    errors: [{ type: "Error", message: "Invalid CSS", path: "/style.css" }],
    diagnostics: [
      { type: "Error", message: "Invalid CSS", path: "/style.css" },
      { type: "Error", message: "Invalid CSS", path: "/style.css" },
      { type: "Warning", message: "Unused variable", path: "/script.js" },
    ],
  };
  assert.deepEqual(buildIssueLines(failed), [
    "- **Error** (/style.css): Invalid CSS",
    "- **Warning** (/script.js): Unused variable",
  ]);
  assert.deepEqual(buildIssueLines({ ...build, diagnostics: [], errors: [] }), []);
  assert.deepEqual(buildIssueLines(null), []);
  assert.deepEqual(buildIssueLines(undefined), []);
});

test("build issues with the same message in different files remain visible", () => {
  assert.deepEqual(
    buildIssueLines({
      ...build,
      status: "Failed",
      diagnostics: [{ type: "Error", message: "Unexpected token", path: "/script.js" }],
      errors: [{ type: "Error", message: "Unexpected token", path: "/utils.js" }],
    }),
    ["- **Error** (/script.js): Unexpected token", "- **Error** (/utils.js): Unexpected token"],
  );
});

test("build issues with the same message and path but different types remain visible", () => {
  assert.deepEqual(
    buildIssueLines({
      ...build,
      status: "Failed",
      diagnostics: [{ type: "Warning", message: "Missing dependency", path: "/script.js" }],
      errors: [{ type: "Error", message: "Missing dependency", path: "/script.js" }],
    }),
    ["- **Warning** (/script.js): Missing dependency", "- **Error** (/script.js): Missing dependency"],
  );
});

test("duplicate build issues treat null and omitted paths alike but preserve file-specific issues", () => {
  assert.deepEqual(
    buildIssueLines({
      ...build,
      status: "Failed",
      diagnostics: [{ type: "Error", message: "Missing dependency", path: null }],
      errors: [
        { type: "Error", message: "Missing dependency" },
        { type: "Error", message: "Missing dependency", path: "/script.js" },
        { type: "Error", message: "Missing dependency", path: "/script.js" },
      ],
    }),
    ["- **Error**: Missing dependency", "- **Error** (/script.js): Missing dependency"],
  );
});

test("build status distinguishes compiler follow-ups from terminal canceled builds", () => {
  assert.equal(isBuildPending({ ...build, status: "Canceled", next_id: "next" }), true);
  assert.equal(isBuildPending({ ...build, status: "Canceled", next_id: null }), false);
  assert.match(buildMessage({ ...build, status: "Canceled" }), /compiler needs changes/);
});

test("deployment uses the checked successful version, not a moving head", async () => {
  const { client, calls } = fixture([
    json(pen),
    json({ id: "deployment-1", version_id: "version-1", url: "https://example.codepen.app/" }),
  ]);
  await client.deployPen("pen-1");
  assert.equal(body(calls[1]).version_id, "version-1");
  const failed = fixture([json({ ...pen, saved_version: { ...version, build: { ...build, status: "Failed" } } })]);
  await assert.rejects(() => failed.client.deployPen("pen-1"), /successful saved build/);
  assert.equal(failed.calls.length, 1);
});

test("204 deletion succeeds without parsing JSON", async () => {
  const { client, calls } = fixture([new Response(null, { status: 204 }), new Response(null, { status: 204 })]);
  await client.deleteCollection("collection-1");
  await client.removeFromCollection("collection-2", "pen-1");
  assert.equal(calls[0].options?.method, "DELETE");
  assert.equal(calls[1].url, "https://api.codepen.io/v2/collections/collection-2/pens/pen-1");
});

test("asset upload sends binary bytes as multipart and lets fetch set its boundary", async () => {
  const { client, calls } = fixture([json(asset, 201)]);
  const bytes = new Uint8Array([137, 80, 78, 71]);
  await client.uploadAsset("logo.png", bytes);
  const form = calls[0].options?.body;
  assert.ok(form instanceof FormData);
  assert.equal(form.get("filename"), "logo.png");
  const upload = form.get("file");
  assert.ok(upload instanceof Blob);
  assert.deepEqual(new Uint8Array(await upload.arrayBuffer()), bytes);
  assert.equal(new Headers(calls[0].options?.headers).has("Content-Type"), false);
});

test("asset filenames and upload sizes are checked before a request", () => {
  const { client, calls } = fixture([]);
  assert.throws(() => client.uploadAsset("bad/name.png", new Uint8Array([1])), /slashes/);
  assert.throws(() => client.uploadAsset("empty.png", new Uint8Array()), /non-empty/);
  assert.throws(() => client.uploadAsset("huge.png", new Uint8Array(30 * 1024 * 1024 + 1)), /30 MB/);
  assert.equal(calls.length, 0);
});
