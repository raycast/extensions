import { beforeEach, expect, test, vi } from "vitest";

import { saveAccount, setDefaultAccount } from "@/lib/accounts";
import { listRecovery } from "@/lib/recovery";

import createDraftTool from "@/tools/create-draft";
import listAccountsTool from "@/tools/list-accounts";
import listDraftsTool from "@/tools/list-my-drafts";

import { LocalStorage, open, storage } from "./mocks/raycast";

const account = { id: "first", label: "First", publication: "example", sessionCookie: "synthetic" };
beforeEach(async () => {
  storage.clear();
  await saveAccount(account);
});
test("account outputs contain only public metadata and default status", async () => {
  await setDefaultAccount("first");
  expect(await listAccountsTool()).toEqual([{ id: "first", label: "First", publication: "example", isDefault: true }]);
  expect(JSON.stringify(await listAccountsTool())).not.toContain(account.sessionCookie);
});
test("list tool resolves the selected account, pagination and no preferences", async () => {
  const mock = vi.fn().mockResolvedValue(Response.json({ posts: [], offset: 25, limit: 25, total: 25 }));
  vi.stubGlobal("fetch", mock);
  expect(await listDraftsTool({ accountId: "first", offset: 25 })).toEqual({ drafts: [] });
  expect(mock.mock.calls[0][1].headers.Cookie).toBe("substack.sid=synthetic");
  expect(open).not.toHaveBeenCalled();
  await expect(listDraftsTool({ accountId: "wrong" })).rejects.toThrow(/no longer exists/);
});
function creationFetch(failUpdate = false) {
  let body: Record<string, unknown> = {};
  const mock = vi.fn(async (url: RequestInfo | URL, options?: RequestInit) => {
    if (String(url).endsWith("publication_user")) return Response.json({ pub_users: [{ user_id: 1 }] });
    if (options?.method === "POST") return Response.json({ id: 42 });
    if (options?.method === "PUT") {
      body = JSON.parse(String(options.body));
      return Response.json({}, { status: failUpdate ? 500 : 200 });
    }
    return Response.json({ ...body, is_published: false });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
test("create tool persists recovery before update and returns an unpublished draft without launching editor", async () => {
  const mock = creationFetch();
  const result = await createDraftTool({ title: " Title ", markdown: "Body" });
  expect(result).toMatchObject({ accountId: "first", title: "Title", status: "unpublished", id: 42 });
  expect(await listRecovery("first")).toMatchObject([{ verified: true }]);
  expect(open).not.toHaveBeenCalled();
  expect(mock.mock.calls.filter(([, o]) => o?.method === "POST")).toHaveLength(1);
});
test("partial save tells AI a draft exists and never retries the POST", async () => {
  const mock = creationFetch(true);
  expect(
    await createDraftTool({ accountId: "first", title: "Title", subtitle: "Subtitle", markdown: "Body" }),
  ).toMatchObject({
    status: "needs-review",
    draftExists: true,
    editorUrl: "https://example.substack.com/publish/post/42",
  });
  expect(mock.mock.calls.filter(([, o]) => o?.method === "POST")).toHaveLength(1);
  expect((await listRecovery("first"))[0].verified).toBe(false);
});
test("final persistence failure retains the created URL", async () => {
  creationFetch();
  LocalStorage.setItem
    .mockImplementationOnce(async (key, value) => {
      storage.set(key, value);
    })
    .mockRejectedValueOnce(new Error("synthetic"));
  expect(await createDraftTool({ title: "Title", markdown: "Body" })).toMatchObject({ status: "needs-review", id: 42 });
});
test("unsupported input and ambiguous account do not write", async () => {
  await expect(createDraftTool({ title: "Title", markdown: "```\ncode\n```" })).rejects.toThrow(/not supported/);
  await saveAccount({ ...account, id: "second" });
  await expect(createDraftTool({ title: "Title", markdown: "Body" })).rejects.toThrow(/Select/);
  expect(fetch).not.toHaveBeenCalled();
});
