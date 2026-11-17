import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);

// Exercise the real API functions without loading Raycast's native runtime or account credentials.
function loadModule<T>(path: string, imports: Record<string, unknown>): T {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const exports = {};
  new Function("require", "exports", outputText)((name: string) => imports[name] ?? require(name), exports);
  return exports as T;
}

type InboxAPI = typeof import("../src/api/inboxNotifications.ts");
function inboxAPI(rawRequest: (query: string, variables: Record<string, unknown>) => Promise<unknown>) {
  return loadModule<InboxAPI>("../src/api/inboxNotifications.ts", {
    "./linearClient": { getLinearClient: () => ({ graphQLClient: { rawRequest } }) },
  });
}

function page(ids: string[], hasNextPage = false, endCursor: string | null = null) {
  return {
    data: {
      inboxNotifications: {
        nodes: ids.map((id) => ({ id, url: "https://github.com/example/repo/pull/1" })),
        pageInfo: { hasNextPage, endCursor },
      },
      organization: { urlKey: "example" },
    },
  };
}

test("preserves Linear's groups across pages, even when they link to the same PR", async () => {
  const ids = Array.from({ length: 51 }, (_, i) => `group-${i}`);
  const cursors: unknown[] = [];
  const api = inboxAPI(async (query, variables) => {
    assert.match(query, /inboxNotifications\(unreadOnly: true/);
    cursors.push(variables.after);
    return variables.after === null ? page(ids.slice(0, 50), true, "next") : page(ids.slice(50));
  });
  const result = await api.getInboxNotifications();
  assert.deepEqual(
    result.notifications.map((n) => n.id),
    ids,
  );
  assert.equal(result.urlKey, "example");
  assert.deepEqual(cursors, [null, "next"]);
});

test("an empty inbox needs only one request", async () => {
  let calls = 0;
  const api = inboxAPI(async () => {
    calls++;
    return page([]);
  });
  assert.deepEqual((await api.getInboxNotifications()).notifications, []);
  assert.equal(calls, 1);
});

test("later-page failures reject instead of returning a misleading partial count", async () => {
  const api = inboxAPI(async (_query, { after }) => {
    if (after) throw new Error("Network unavailable");
    return page(["first"], true, "next");
  });
  await assert.rejects(api.getInboxNotifications(), /Network unavailable/);
});

test("missing or stalled cursors fail instead of truncating or looping", async () => {
  for (const cursor of [null, "same"]) {
    const api = inboxAPI(async () => page(["first"], true, cursor));
    await assert.rejects(api.getInboxNotifications(), /next page/);
  }
});

test("marking a group read sends its representative ID to Linear's stack mutation", async () => {
  let calls = 0;
  const api = inboxAPI(async (query, variables) => {
    calls++;
    assert.match(query, /inboxNotificationUpdate\(id: \$id, input: \{ read: true \}\)/);
    assert.deepEqual(variables, { id: "representative" });
    return { data: { inboxNotificationUpdate: { success: true } } };
  });
  await api.markInboxNotificationAsRead("representative");
  assert.equal(calls, 1);
});

test("rejects unsuccessful group updates", async () => {
  for (const response of [{}, { data: { inboxNotificationUpdate: { success: false } } }]) {
    const api = inboxAPI(async () => response);
    await assert.rejects(api.markInboxNotificationAsRead("representative"), /Failed to mark/);
  }
});

test("uses native unread groups and passes the query mode to the cache", async () => {
  const representative = { id: "group", readAt: "2026-11-01T00:00:00Z" };
  const legacy = { id: "individual", readAt: null };
  const queries: string[] = [];
  const cacheArgs: boolean[][] = [];
  const pending: Promise<unknown>[] = [];
  const { default: useNotifications } = loadModule<typeof import("../src/hooks/useNotifications.ts")>(
    "../src/hooks/useNotifications.ts",
    {
      "@raycast/utils": {
        useCachedPromise: (fn: (grouped: boolean) => Promise<unknown>, args: boolean[]) => {
          cacheArgs.push(args);
          pending.push(fn(args[0]));
          return { data: { notifications: args[0] ? [representative] : [legacy] } };
        },
      },
      "../api/getNotifications": { getNotifications: async () => queries.push("individual") },
      "../api/inboxNotifications": { getInboxNotifications: async () => queries.push("grouped") },
    },
  );
  assert.deepEqual(useNotifications(true).unreadNotifications, [representative]);
  assert.deepEqual(useNotifications().unreadNotifications, [legacy]);
  await Promise.all(pending);
  assert.deepEqual(cacheArgs, [[true], [false]]);
  assert.deepEqual(queries, ["grouped", "individual"]);
});
