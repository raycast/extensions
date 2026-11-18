import { beforeEach, expect, test, vi } from "vitest";

import { saveAccount } from "@/lib/accounts";
import { draftBody } from "@/lib/createDraft";
import { draftMarkdown, markdownBody } from "@/lib/draftMarkdown";
import { DraftEditError, loadDraft, saveDraft } from "@/lib/editDraft";

import { LocalStorage, storage } from "./mocks/raycast";

const account = { id: "first", label: "First", publication: "example", sessionCookie: "synthetic" };
const raw = {
  id: 42,
  type: "newsletter",
  is_published: false,
  draft_title: "Original",
  draft_subtitle: "Subtitle",
  draft_body: draftBody("Original body"),
  draft_updated_at: "2026-10-07T12:00:00Z",
  draftBylines: [{ id: 7 }],
  draft_section_id: 8,
};
beforeEach(async () => {
  storage.clear();
  await saveAccount(account);
});
function server() {
  let current = { ...raw };
  const mock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "PUT") current = { ...current, ...JSON.parse(String(init.body)) };
    return Response.json(current);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
test("edits the same draft and preserves authors and section with verified recovery", async () => {
  const mock = server();
  const original = await loadDraft(account, 42);
  await saveDraft(account, original, { title: " Updated ", subtitle: " New ", body: draftBody("New body") });
  expect(mock.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "GET", "PUT", "GET"]);
  expect(mock.mock.calls[2][0]).toBe("https://example.substack.com/api/v1/drafts/42");
  expect(JSON.parse(String(mock.mock.calls[2][1]?.body))).toMatchObject({
    draft_bylines: [{ id: 7, is_guest: false }],
    draft_section_id: 8,
    section_chosen: true,
  });
  expect([...storage.values()].join()).toContain('"verified":true');
});
test.each([0, -1, 1.5, NaN])("invalid ID %s cannot fetch", async (id) => {
  const mock = server();
  await expect(loadDraft(account, id)).rejects.toThrow(/ID/);
  expect(mock).not.toHaveBeenCalled();
});
test.each([
  null,
  { ...raw, id: 43 },
  { ...raw, is_published: true },
  { ...raw, type: "podcast" },
  { ...raw, draft_title: 7 },
  { ...raw, draft_body: "bad" },
  { ...raw, draft_body: '{"type":"text"}' },
  { ...raw, draftBylines: {} },
  { ...raw, draftBylines: [null] },
  { ...raw, draftBylines: [{ id: -1 }] },
  { ...raw, draft_section_id: "bad" },
])("rejects invalid or published draft %#", async (value) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(value)),
  );
  await expect(loadDraft(account, 42)).rejects.toThrow();
});
test("empty fields and raw authors are preserved", async () => {
  const authors = [{ id: 7, is_guest: true, extra: "preserve" }];
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        ...raw,
        draft_title: null,
        draft_subtitle: null,
        draft_body: null,
        draft_updated_at: null,
        draft_bylines: authors,
        draft_section_id: null,
        section_id: null,
      }),
    ),
  );
  expect(await loadDraft(account, 42)).toMatchObject({
    title: "",
    subtitle: "",
    body: markdownBody(""),
    updatedAt: null,
    bylines: authors,
    sectionId: null,
  });
});
test.each(["title", "subtitle", "body", "updatedAt"] as const)("changes to %s block PUT", async (field) => {
  const mock = server();
  const original = await loadDraft(account, 42);
  await expect(saveDraft(account, { ...original, [field]: "older" }, original)).rejects.toThrow(/changed in Substack/);
  expect(mock).toHaveBeenCalledTimes(2);
});
test("blank titles and changed origins block saving", async () => {
  const mock = server();
  const original = await loadDraft(account, 42);
  await expect(saveDraft(account, original, { ...original, title: " " })).rejects.toThrow(/title/);
  await expect(saveDraft({ ...account, publication: "other" }, original, original)).rejects.toThrow(
    /connection changed/,
  );
  expect(mock).toHaveBeenCalledTimes(1);
});
test.each(["write", "verify", "storage"])("uncertain %s failures require browser recovery", async (stage) => {
  const mock = server();
  const original = await loadDraft(account, 42);
  if (stage === "write")
    mock
      .mockImplementationOnce(async () => Response.json(raw))
      .mockImplementationOnce(async () => Response.json({}, { status: 500 }));
  if (stage === "verify")
    mock
      .mockImplementationOnce(async () => Response.json(raw))
      .mockImplementationOnce(async () => Response.json({}))
      .mockImplementationOnce(async () => Response.json(raw));
  if (stage === "storage")
    LocalStorage.setItem
      .mockImplementationOnce(async (key, value) => {
        storage.set(key, value);
      })
      .mockRejectedValueOnce(new Error("failed"));
  await expect(saveDraft(account, original, { ...original, title: "Updated" })).rejects.toBeInstanceOf(DraftEditError);
  expect(mock.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(1);
});
test.each([
  "Hello",
  "# Heading",
  "**Bold** and *italic*",
  "[Link](https://example.com)",
  "`code`",
  "- One\n- Two",
  "3. One\n4. Two",
  "> Quote",
  "---",
  "![Alt](https://example.com/a.png)",
  "",
])("Markdown conversion preserves %s", (markdown) => {
  const body = markdownBody(markdown);
  const converted = draftMarkdown(body);
  expect(converted).toBeDefined();
  expect(JSON.parse(markdownBody(converted!))).toEqual(JSON.parse(body));
});
test.each([
  "bad",
  '{"type":"text"}',
  '{"type":"doc","content":[{"type":"paywall"}]}',
  JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: "Centered" }] }],
  }),
  JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "X", marks: [{ type: "unknown" }] }] }],
  }),
])("rich or malformed content stays read-only %#", (body) => {
  expect(draftMarkdown(body)).toBeUndefined();
});

test("drafts with published author metadata can load without draft author fields", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        ...raw,
        draft_bylines: null,
        draftBylines: undefined,
        publishedBylines: [{ id: 9, name: "Synthetic author" }],
      }),
    ),
  );
  expect((await loadDraft(account, 42)).bylines).toEqual([{ id: 9, is_guest: false }]);
});
test("drafts with no author fields can load with an empty byline list", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ ...raw, draftBylines: undefined })),
  );
  expect((await loadDraft(account, 42)).bylines).toEqual([]);
});

test.each([
  { draft_bylines: [], draftBylines: [{ id: 9, is_guest: true }] },
  { draft_bylines: [], draftBylines: [], publishedBylines: [{ id: 9 }] },
])("empty author arrays fall through to existing metadata %#", async (fields) => {
  let current = { ...raw, ...fields };
  const mock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "PUT") current = { ...current, ...JSON.parse(String(init.body)) };
    return Response.json(current);
  });
  vi.stubGlobal("fetch", mock);
  const original = await loadDraft(account, 42);
  await saveDraft(account, original, { ...original, title: "Updated" });
  const payload = JSON.parse(String(mock.mock.calls.find(([, init]) => init?.method === "PUT")![1]?.body));
  expect(payload.draft_bylines).toEqual([{ id: 9, is_guest: "publishedBylines" in fields ? false : true }]);
});
test.each([
  { draftBylines: [{ id: 9, is_guest: "bad" }] },
  { draftBylines: null, publishedBylines: [{ id: "9" }] },
  { draft_bylines: {}, publishedBylines: [{ id: 9 }] },
])("malformed authors still block loading %#", async (fields) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ ...raw, ...fields })),
  );
  await expect(loadDraft(account, 42)).rejects.toThrow("Substack returned invalid draft authors.");
});
