import { expect, test, vi } from "vitest";

import { listNewsletterDrafts, parseDraftPage } from "@/lib/listDrafts";
import { createSubstackClient } from "@/lib/substackClient";

const account = { id: "first", label: "First", publication: "example", sessionCookie: "synthetic-session" };
const post = {
  id: 42,
  type: "newsletter",
  draft_title: "Draft",
  is_published: false,
  draft_updated_at: "2026-01-01T00:00:00Z",
};
const page = { posts: [post], offset: 0, limit: 25, total: 1, isCapped: false };
test("verified private contract uses account credentials, derives URLs, and returns pagination", async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ ...page, total: 26 }));
  vi.stubGlobal("fetch", fetchMock);
  expect(await listNewsletterDrafts(account)).toEqual({
    drafts: [
      {
        accountId: "first",
        id: 42,
        title: "Draft",
        updatedAt: post.draft_updated_at,
        editorUrl: "https://example.substack.com/publish/post/42",
      },
    ],
    nextOffset: 25,
  });
  const [url, options] = fetchMock.mock.calls[0];
  const parsed = new URL(url);
  expect(parsed.pathname).toBe("/api/v1/post_management/drafts");
  expect(Object.fromEntries(parsed.searchParams)).toEqual({
    offset: "0",
    limit: "25",
    order_by: "draft_updated_at",
    order_direction: "desc",
  });
  expect(options).toMatchObject({
    method: "GET",
    redirect: "error",
    headers: { Cookie: "substack.sid=synthetic-session" },
  });
  fetchMock.mockResolvedValue(Response.json({ ...page, offset: 25 }));
  fetchMock.mockResolvedValue(Response.json({ ...page, offset: 25, total: 26 }));
  expect((await listNewsletterDrafts(account, 25)).nextOffset).toBeUndefined();
});
test("empty drafts, blank titles, published posts and other post types", () => {
  expect(parseDraftPage({ ...page, posts: [], total: 0 }, account, 0)).toEqual({ drafts: [] });
  const result = parseDraftPage(
    {
      ...page,
      posts: [
        { ...post, draft_title: "", draft_subtitle: "Subtitle" },
        { ...post, id: 43, is_published: true },
        { ...post, id: 44, type: "podcast" },
      ],
      total: 3,
    },
    account,
    0,
  );
  expect(result.drafts).toHaveLength(1);
  expect(result.drafts[0]).toMatchObject({ title: "Untitled draft", subtitle: "Subtitle" });
});
test.each([
  null,
  {},
  { ...page, posts: null },
  { ...page, limit: 0 },
  { ...page, offset: 1 },
  { ...page, total: -1 },
  { ...page, total: 0 },
  { ...page, isCapped: "false" },
  { ...page, posts: [], total: 30 },
  { ...page, posts: [null] },
  ...[
    { id: 0 },
    { id: 1.5 },
    { is_published: undefined },
    { draft_title: null },
    { draft_subtitle: 4 },
    { draft_updated_at: "bad" },
  ].map((change) => ({ ...page, posts: [{ ...post, ...change }] })),
])("malformed remote lists fail explicitly", (value) => {
  expect(() => parseDraftPage(value, account, 0)).toThrow(/unexpected draft list/);
});
test("capped results do not claim completeness", () => {
  expect(() => parseDraftPage({ ...page, isCapped: true }, account, 0)).toThrow(/capped/);
});
test.each([-1, 0.5, NaN])("invalid offset never fetches", async (offset) => {
  await expect(listNewsletterDrafts(account, offset)).rejects.toThrow(/offset/);
  expect(fetch).not.toHaveBeenCalled();
});
test.each([401, 403, 500])("HTTP %s is sanitized", async (status) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ secret: account.sessionCookie }, { status })));
  await expect(listNewsletterDrafts(account)).rejects.toThrow(status < 500 ? /denied access/ : /HTTP 500/);
});
test("network failure and malformed JSON are distinct", async () => {
  const fetchMock = vi.fn().mockRejectedValue(new Error(account.sessionCookie));
  vi.stubGlobal("fetch", fetchMock);
  await expect(listNewsletterDrafts(account)).rejects.toThrow(/Could not reach/);
  fetchMock.mockResolvedValue(new Response("not json"));
  await expect(listNewsletterDrafts(account)).rejects.toThrow(/unexpected response/);
});
test("client holds an immutable origin and cookie snapshot, does not follow redirects or retry", async () => {
  const mutable = { ...account };
  const client = createSubstackClient(mutable);
  mutable.publication = "other";
  mutable.sessionCookie = "other";
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 302 }));
  vi.stubGlobal("fetch", fetchMock);
  await expect(client.request("drafts", "POST", { draft_title: "Title" })).rejects.toThrow(/HTTP 302/);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe("https://example.substack.com/api/v1/drafts");
  expect(fetchMock.mock.calls[0][1].headers.Cookie).toBe("substack.sid=synthetic-session");
});
