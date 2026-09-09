import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import { hashAuthKey, hashAccountAuthKeys } from "./usage-cache.ts";
import type { CachedUsagePayload } from "./usage-cache.ts";
import type { OpenRouterError, OpenRouterUsage } from "../openrouter/types.ts";

type Payload = CachedUsagePayload<OpenRouterUsage, OpenRouterError>;

const state = {
  cache: new Map<string, string>(),
  commandName: "agent-usage",
  cacheTtl: "180",
  data: undefined as CachedUsagePayload<unknown, unknown> | undefined,
  run: undefined as (() => Promise<CachedUsagePayload<unknown, unknown>>) | undefined,
};

Object.assign(globalThis, { usageHookTestState: state });

const mocks: Record<string, string> = {
  "@raycast/api": `
    const state = globalThis.usageHookTestState;
    export class Cache {
      get(key) { return state.cache.get(key); }
      set(key, value) { state.cache.set(key, value); }
    }
    export const environment = { get commandName() { return state.commandName; } };
    export const getPreferenceValues = () => ({ cacheTtl: state.cacheTtl, backgroundRefreshInterval: "1" });
  `,
  "@raycast/utils": `
    const state = globalThis.usageHookTestState;
    export function usePromise(fn) {
      state.run = fn;
      return { data: state.data, isLoading: !state.data, revalidate: fn };
    }
  `,
  react: `
    export const useCallback = (fn) => fn;
    export const useRef = (value) => ({ current: value });
    export const useState = (initial) => [initial()];
  `,
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in mocks) {
      return { url: "data:text/javascript," + encodeURIComponent(mocks[specifier]), shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { createUsageHook, createAccountsHook } = await import("./hooks.ts");

const usage: OpenRouterUsage = { source: "account", totalCredits: 100, totalUsage: 25, remaining: 75 };
const cached: Payload = { usage, error: null, timestamp: 1, authHash: hashAuthKey("test-key") };

test.beforeEach(() => {
  state.cache.clear();
  state.cache.set("openrouter", JSON.stringify(cached));
  state.commandName = "agent-usage";
  state.cacheTtl = "180";
  state.data = undefined;
  state.run = undefined;
});

test("OpenRouter displays cached credits while shell auth is pending and skips the credits request", async () => {
  let resolveAuth!: (key: string) => void;
  const auth = new Promise<string>((resolve) => {
    resolveAuth = resolve;
  });
  let requests = 0;
  const useUsage = createUsageHook<OpenRouterUsage, OpenRouterError>({
    agentId: "openrouter",
    resolveAuthKey: () => auth,
    fetcher: async () => {
      requests++;
      return { usage, error: null };
    },
  });

  const view = useUsage();
  assert.deepEqual(view.usage, usage);
  assert.equal(view.isLoading, false);
  assert.equal(view.lastFetchedAt, 1);
  const pending = state.run!();
  assert.equal(requests, 0);
  resolveAuth("test-key");
  assert.deepEqual(await pending, cached);
  assert.equal(requests, 0);
});

test("changed OpenRouter credentials fetch once using the same resolved key", async () => {
  let resolutions = 0;
  const keys: string[] = [];
  const useUsage = createUsageHook<OpenRouterUsage, OpenRouterError>({
    agentId: "openrouter",
    resolveAuthKey: async () => {
      resolutions++;
      return "new-key";
    },
    fetcher: async (key) => {
      keys.push(key);
      return { usage: null, error: { type: "unauthorized", message: "Invalid key" } };
    },
  });

  useUsage();
  state.data = await state.run!();
  assert.equal(useUsage().error?.type, "unauthorized");
  assert.equal(useUsage().usage, null);
  assert.equal(resolutions, 1);
  assert.deepEqual(keys, ["new-key"]);
  assert.deepEqual(JSON.parse(state.cache.get("openrouter")!), cached);
});

test("manual refresh bypasses cached OpenRouter credits", async () => {
  let requests = 0;
  const useUsage = createUsageHook<OpenRouterUsage, OpenRouterError>({
    agentId: "openrouter",
    resolveAuthKey: async () => "test-key",
    fetcher: async () => {
      requests++;
      return { usage, error: null };
    },
  });

  await useUsage().revalidate();
  assert.equal(requests, 1);
  assert.ok(JSON.parse(state.cache.get("openrouter")!).timestamp > cached.timestamp);
});

test("cache misses, disabled caching, and menu bar refreshes keep their loading state", async () => {
  const useUsage = createUsageHook<OpenRouterUsage, OpenRouterError>({
    agentId: "openrouter",
    resolveAuthKey: async () => "test-key",
    fetcher: async () => ({ usage, error: null }),
  });

  state.commandName = "agent-usage-menubar";
  assert.equal(useUsage().isLoading, true);
  assert.equal(useUsage().usage, null);
  const refreshed = await state.run!();
  assert.ok(refreshed.timestamp > cached.timestamp);

  state.commandName = "agent-usage";
  state.cacheTtl = "0";
  assert.equal(useUsage().isLoading, true);
  assert.equal(useUsage().usage, null);

  state.cacheTtl = "180";
  state.cache.clear();
  assert.equal(useUsage().isLoading, true);
  assert.equal(useUsage(false).usage, null);
});

test("account rows render before discovery and current labels and tokens replace the snapshot", async () => {
  const account = { id: "work", label: "Renamed", token: "secret" };
  const row = { accountId: "work", label: "Work", usage, error: null, isOpenCodeActive: false };
  state.cache.set(
    "copilot-accounts",
    JSON.stringify({
      usage: [row],
      error: null,
      timestamp: 1,
      authHash: hashAccountAuthKeys([account], (entry) => JSON.stringify([entry.id, entry.token])),
    }),
  );
  let finishDiscovery!: (accounts: (typeof account)[]) => void;
  const discovery = new Promise<(typeof account)[]>((resolve) => {
    finishDiscovery = resolve;
  });
  let requests = 0;
  const useAccounts = createAccountsHook({
    agentId: "copilot",
    getAccounts: () => discovery,
    fetcher: async () => {
      requests++;
      return { usage, error: null };
    },
    noAccountsError: { type: "not_configured", message: "No accounts" },
  });

  const initial = useAccounts();
  assert.equal(initial.isLoading, false);
  assert.equal(initial.accounts[0].label, "Work");
  assert.equal(initial.accounts[0].token, "");
  const pending = state.run!();
  finishDiscovery([account]);
  state.data = await pending;
  const resolved = useAccounts();
  assert.equal(resolved.accounts[0].label, "Renamed");
  assert.equal(resolved.accounts[0].token, "secret");
  assert.equal(requests, 0);
  assert.doesNotMatch(state.cache.get("copilot-accounts-display")!, /secret|"token"/);
});

test("background discovery caches missing accounts and reopening discovers newly added accounts", async () => {
  let accounts: { id: string; label: string; token: string }[] = [];
  const useAccounts = createAccountsHook({
    agentId: "copilot",
    getAccounts: async () => accounts,
    fetcher: async () => ({ usage, error: null }),
    noAccountsError: { type: "not_configured", message: "No accounts" },
  });
  await useAccounts.refresh();
  assert.equal(useAccounts().accounts[0].error?.type, "not_configured");
  assert.equal(useAccounts().isLoading, false);

  accounts = [{ id: "new", label: "New account", token: "secret" }];
  state.data = await state.run!();
  assert.equal(useAccounts().accounts[0].accountId, "new");
  assert.deepEqual(useAccounts().accounts[0].usage, usage);

  accounts = [];
  state.data = await state.run!();
  assert.equal(useAccounts().accounts[0].accountId, "none");
  state.data = undefined;
  assert.equal(useAccounts().accounts[0].accountId, "none");
});

test("partial account failures are displayed from snapshots but retried during discovery", async () => {
  let requests = 0;
  const useAccounts = createAccountsHook({
    agentId: "copilot",
    getAccounts: async () => [
      { id: "ok", label: "Work", token: "secret-a" },
      { id: "failed", label: "Home", token: "secret-b" },
    ],
    fetcher: async (account) => {
      requests++;
      return account.id === "ok"
        ? { usage, error: null }
        : { usage: null, error: { type: "network_error", message: "Offline" } };
    },
    noAccountsError: { type: "not_configured", message: "No accounts" },
  });
  await useAccounts.refresh();
  assert.equal(useAccounts().accounts.length, 2);
  assert.equal(useAccounts().accounts[1].error?.type, "network_error");
  assert.equal(useAccounts().isLoading, false);
  await state.run!();
  assert.equal(requests, 4);
  assert.equal(state.cache.has("copilot-accounts"), false);
  assert.doesNotMatch(state.cache.get("copilot-accounts-display")!, /secret-a|secret-b|"token"/);
});

test("single-provider unavailable snapshots display immediately but do not skip credential checks", async () => {
  let checks = 0;
  const useUsage = createUsageHook({
    agentId: "missing",
    resolveAuthKey: async () => {
      checks++;
      return "";
    },
    fetcher: async () => ({ usage: null, error: { type: "not_configured", message: "No key" } }),
  });
  await useUsage.refresh();
  assert.equal(useUsage().isLoading, false);
  assert.equal(useUsage().error?.type, "not_configured");
  await state.run!();
  assert.equal(checks, 2);
  assert.equal(state.cache.has("missing"), false);
});

for (const agentId of ["grok", "amp", "antigravity"]) {
  test(`${agentId} without auth resolution reuses fresh cache but rechecks expired usage on open`, async () => {
    const now = Date.now();
    const entry = { ...cached, timestamp: now, authHash: hashAuthKey("") };
    state.cache.set(agentId, JSON.stringify(entry));
    let requests = 0;
    const useUsage = createUsageHook<OpenRouterUsage, OpenRouterError>({
      agentId,
      fetcher: async () => {
        requests++;
        return { usage: null, error: { type: "not_configured", message: "Logged out" } };
      },
    });

    useUsage();
    assert.deepEqual(await state.run!(), entry);
    assert.equal(requests, 0);

    state.cache.set(agentId, JSON.stringify({ ...entry, timestamp: now - 60_001 }));
    const reopening = useUsage();
    assert.deepEqual(reopening.usage, usage);
    assert.equal(reopening.isLoading, false);
    state.data = await state.run!();
    assert.equal(requests, 1);
    assert.equal(useUsage().usage, null);
    assert.equal(useUsage().error?.type, "not_configured");
  });
}
