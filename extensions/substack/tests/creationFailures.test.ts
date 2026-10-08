import { expect, test, vi } from "vitest";

import { DraftSaveError, createNewsletterDraft, draftBody } from "@/lib/createDraft";

const input = { publication: "example", sessionCookie: "synthetic", title: "Title", subtitle: "", markdown: "Body" };
test.each([
  null,
  {},
  { pub_users: [] },
  { pub_users: [{ user_id: 0 }] },
  { pub_users: [{ user_id: -1 }] },
  { pub_users: [{ user_id: 1.5 }] },
])("invalid author stops before POST", async (profile) => {
  const mock = vi.fn().mockResolvedValue(Response.json(profile));
  vi.stubGlobal("fetch", mock);
  await expect(createNewsletterDraft(input, vi.fn())).rejects.toThrow(/author/);
  expect(mock).toHaveBeenCalledTimes(1);
});
test.each([null, {}, { id: -1 }, { id: 1.5 }])("invalid draft IDs never update", async (draft) => {
  const mock = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ pub_users: [{ user_id: 1 }] }))
    .mockResolvedValueOnce(Response.json(draft));
  vi.stubGlobal("fetch", mock);
  await expect(createNewsletterDraft(input, vi.fn())).rejects.toThrow(/draft ID/);
  expect(mock).toHaveBeenCalledTimes(2);
});
test("failed recovery persistence stops body update and carries the created URL", async () => {
  const mock = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ pub_users: [{ user_id: 1 }] }))
    .mockResolvedValueOnce(Response.json({ id: 42 }));
  vi.stubGlobal("fetch", mock);
  await expect(
    createNewsletterDraft(input, () => {
      throw new Error("storage failed");
    }),
  ).rejects.toMatchObject({ draft: { id: 42, editorUrl: "https://example.substack.com/publish/post/42" } });
  expect(mock).toHaveBeenCalledTimes(2);
});
test.each([null, { is_published: true, draft_title: "Title", draft_body: draftBody("Body") }])(
  "invalid read-back preserves recovery",
  async (saved) => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ pub_users: [{ user_id: 1 }] }))
      .mockResolvedValueOnce(Response.json({ id: 42 }))
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(Response.json(saved));
    vi.stubGlobal("fetch", mock);
    await expect(createNewsletterDraft(input, vi.fn())).rejects.toThrow(DraftSaveError);
  },
);
test("empty title and malformed JSON stop creation", async () => {
  await expect(createNewsletterDraft({ ...input, title: " " }, vi.fn())).rejects.toThrow(/title/);
  expect(fetch).not.toHaveBeenCalled();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{")));
  await expect(createNewsletterDraft(input, vi.fn())).rejects.toThrow(/unexpected response/);
});
test("timeout and redirect rejection never retry", async () => {
  const mock = vi.fn().mockRejectedValue(new DOMException("synthetic", "TimeoutError"));
  vi.stubGlobal("fetch", mock);
  await expect(createNewsletterDraft(input, vi.fn())).rejects.toThrow(/Could not reach/);
  expect(mock).toHaveBeenCalledTimes(1);
});
