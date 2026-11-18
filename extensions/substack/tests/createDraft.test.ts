import { expect, test, vi } from "vitest";

import { DraftSaveError, createNewsletterDraft, draftBody, publicationOrigin } from "../src/lib/createDraft.ts";

const input = {
  publication: "example",
  sessionCookie: "test-session",
  connectCookie: "test-connect",
  title: " My newsletter ",
  subtitle: " A subtitle ",
  markdown: "# Hello\n\nA **bold** paragraph with a [link](https://example.com).",
};

test("publication addresses keep session cookies on a canonical Substack origin", () => {
  for (const value of ["example", "example.substack.com", "https://example.substack.com/"]) {
    expect(publicationOrigin(value)).toBe("https://example.substack.com");
  }
  for (const value of [
    "https://attacker.example",
    "http://example.substack.com",
    "https://example.substack.com.attacker.example",
    "https://secret@example.substack.com",
    "https://example.substack.com/p/post",
    "https://example.substack.com?redirect=attacker",
    "https://example.substack.com:8443",
    "",
  ]) {
    expect(() => publicationOrigin(value)).toThrow();
  }
});

test("Markdown conversion preserves headings, formatting, lists, quotes and remote images", () => {
  const doc = JSON.parse(
    draftBody(`${input.markdown}\n\n- One\n- Two\n\n> Quoted\n\n![Alt](https://example.com/image.png)`),
  );
  expect(doc.content.map((node: { type: string }) => node.type)).toEqual([
    "heading",
    "paragraph",
    "bullet_list",
    "blockquote",
    "captionedImage",
  ]);
  expect(doc.content[1].content[1].marks[0].type).toBe("strong");
  expect(doc.content[4].attrs.src).toBe("https://example.com/image.png");
});

test("unsupported Markdown fails before conversion can silently discard content", () => {
  for (const markdown of [
    " ",
    "```js\nalert(1)\n```",
    "| A | B |\n|---|---|\n| 1 | 2 |",
    "<div>Hello</div>",
    "~~Deleted~~",
    "- [x] Done",
    "![Local](./image.png)",
    "Text ![Inline](https://example.com/image.png)",
    "**![Inline](https://example.com/image.png)**",
    "- ![Inline](https://example.com/image.png)",
    "> ```\n> code\n> ```",
  ])
    expect(() => draftBody(markdown)).toThrow();
});

test("creates and verifies an unpublished newsletter without publish or send requests", async () => {
  const calls: { path: string; method: string; body?: Record<string, unknown> }[] = [];
  let updated: Record<string, unknown> = {};
  vi.stubGlobal("fetch", async (url: RequestInfo | URL, options?: RequestInit) => {
    expect(options?.redirect).toBe("error");
    expect(new Headers(options?.headers).get("Cookie")).toBe("substack.sid=test-session; connect.sid=test-connect");
    const path = new URL(String(url)).pathname;
    const method = options?.method ?? "GET";
    const body = options?.body ? JSON.parse(String(options.body)) : undefined;
    calls.push({ path, method, body });
    if (path.endsWith("publication_user")) return Response.json({ pub_users: [{ user_id: 7 }] });
    if (method === "POST") return Response.json({ id: 42 });
    if (method === "PUT") {
      updated = body;
      return Response.json({ id: 42 });
    }
    return Response.json({ ...updated, is_published: false });
  });
  let remembered = false;
  const result = await createNewsletterDraft(input, (draft) => {
    expect(draft.id).toBe(42);
    expect(calls.length).toBe(2);
    remembered = true;
  });
  expect(remembered).toBe(true);
  expect(result.editorUrl).toBe("https://example.substack.com/publish/post/42");
  expect(calls.map(({ path, method }) => `${method} ${path}`)).toEqual([
    "GET /api/v1/publication_user",
    "POST /api/v1/drafts",
    "PUT /api/v1/drafts/42",
    "GET /api/v1/drafts/42",
  ]);
  expect(calls[1].body?.type).toBe("newsletter");
  expect(updated.draft_title).toBe("My newsletter");
  expect(updated.draft_bylines).toEqual([{ id: 7, is_guest: false }]);
  expect("should_send_email" in updated).toBe(false);
});

test("expired authentication stops before draft creation and does not expose the credential", async () => {
  let calls = 0;
  vi.stubGlobal("fetch", async () => {
    calls++;
    return Response.json({ secret: input.sessionCookie }, { status: 401 });
  });
  await expect(createNewsletterDraft(input, () => expect.fail())).rejects.toThrow(/Refresh your session cookies/);
  expect(calls).toBe(1);
});

test("an uncertain POST is not retried", async () => {
  let posts = 0;
  vi.stubGlobal("fetch", async (_url: RequestInfo | URL, options?: RequestInit) => {
    if (options?.method === "POST") {
      posts++;
      throw new TypeError("Connection closed");
    }
    return Response.json({ pub_users: [{ user_id: 7 }] });
  });
  await expect(createNewsletterDraft(input, () => expect.fail())).rejects.toThrow(
    /Check your connection and Substack drafts/,
  );
  expect(posts).toBe(1);
});

test("an incomplete draft keeps its ID for recovery and does not retry the write", async () => {
  let writes = 0;
  let rememberedId: number | undefined;
  vi.stubGlobal("fetch", async (_url: RequestInfo | URL, options?: RequestInit) => {
    if (options?.method === "POST") return Response.json({ id: 42 });
    if (options?.method === "PUT") {
      writes++;
      return Response.json({}, { status: 503 });
    }
    return Response.json({ pub_users: [{ user_id: 7 }] });
  });
  await expect(
    createNewsletterDraft(input, (draft) => {
      rememberedId = draft.id;
    }),
  ).rejects.toMatchObject({ draft: { id: 42 } });
  expect(rememberedId).toBe(42);
  expect(writes).toBe(1);
});

test("a mismatched read-back does not report success", async () => {
  vi.stubGlobal("fetch", async (url: RequestInfo | URL, options?: RequestInit) => {
    if (String(url).endsWith("publication_user")) return Response.json({ pub_users: [{ user_id: 7 }] });
    if (options?.method === "POST" || options?.method === "PUT") return Response.json({ id: 42 });
    return Response.json({ draft_title: "My newsletter", draft_body: "{}" });
  });
  await expect(createNewsletterDraft(input, () => {})).rejects.toThrow(DraftSaveError);
});

test("malformed cookie values and unsupported content do not trigger requests", async () => {
  vi.stubGlobal("fetch", async () => expect.fail("Unexpected request"));
  for (const sessionCookie of ["", "substack.sid=value", "value; other=secret", "value\nsecret"]) {
    await expect(createNewsletterDraft({ ...input, sessionCookie }, () => {})).rejects.toThrow(/cookie value/);
  }
  await expect(createNewsletterDraft({ ...input, markdown: "```\ncode\n```" }, () => {})).rejects.toThrow(
    /not supported/,
  );
});
