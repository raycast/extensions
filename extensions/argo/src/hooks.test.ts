import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

test("drafts remain isolated across bridge identities and never write before configuration loads", async () => {
  const source = ts.createSourceFile(
    "hooks.ts",
    readFileSync(new URL("./hooks.ts", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = source.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === "useDraft",
  );
  assert.ok(declaration);
  const states: unknown[] = [],
    refs: Array<{ current: any }> = [],
    effects: Array<() => void> = [];
  let cursor = 0,
    refCursor = 0;
  const data = new Map<string, string>([
    ["draft:bridge-a:binding", "saved-a"],
    ["draft:bridge-b:binding", "saved-b"],
  ]);
  const exports = {} as {
    useDraft: (
      id: string,
      identity?: string,
    ) => { text: string; ready: boolean; change: (value: string) => void; clearIf: (value: string) => void };
  };
  runInNewContext(
    ts.transpileModule(declaration.getText(source), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
    }).outputText,
    {
      exports,
      useState(initial: any) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [
          states[index],
          (value: unknown) => {
            states[index] = value;
          },
        ];
      },
      useRef(initial: unknown) {
        const index = refCursor++;
        return refs[index] ?? (refs[index] = { current: initial });
      },
      useEffect(effect: () => void) {
        effects.push(effect);
      },
      draftKey: (id: string, identity: string) => `draft:${identity ?? "unconfigured"}:${id}`,
      LocalStorage: {
        async getItem(key: string) {
          return data.get(key);
        },
        async setItem(key: string, value: string) {
          data.set(key, value);
        },
        async removeItem(key: string) {
          data.delete(key);
        },
      },
      showToast() {},
      Toast: { Style: {} },
    },
  );
  const render = (identity?: string) => {
    cursor = 0;
    refCursor = 0;
    return exports.useDraft("binding", identity);
  };
  render().change("must not persist");
  effects.pop()!();
  assert.equal(data.has("draft:unconfigured:binding"), false);
  render("bridge-a");
  effects.pop()!();
  await new Promise<void>((resolve) => setImmediate(resolve));
  let draft = render("bridge-a");
  assert.equal(draft.text, "saved-a");
  assert.equal(draft.ready, true);
  draft.change("edited-a");
  await new Promise<void>((resolve) => setImmediate(resolve));
  render("bridge-b");
  effects.pop()!();
  await new Promise<void>((resolve) => setImmediate(resolve));
  draft = render("bridge-b");
  assert.equal(draft.text, "saved-b");
  draft.change("edited-b");
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(data.get("draft:bridge-a:binding"), "edited-a");
  assert.equal(data.get("draft:bridge-b:binding"), "edited-b");
  draft.clearIf("old text");
  assert.equal(render("bridge-b").text, "edited-b");
  draft.clearIf("edited-b");
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(data.has("draft:bridge-b:binding"), false);
});

function hookHarness(name: "useHub" | "useBridges", globals: Record<string, unknown>) {
  const source = ts.createSourceFile(
    "hooks.ts",
    readFileSync(new URL("./hooks.ts", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration);
  const states: any[] = [],
    refs: Array<{ current: any }> = [],
    effects: Array<{ run: () => void | (() => void); deps: any[]; cleanup?: () => void }> = [];
  const scheduled: number[] = [];
  let cursor = 0,
    refCursor = 0,
    effectCursor = 0;
  const exports = {} as Record<string, (...args: any[]) => any>;
  runInNewContext(
    ts.transpileModule(declaration.getText(source), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
    }).outputText,
    {
      exports,
      AbortController,
      setTimeout,
      clearTimeout,
      useState(initial: any) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [
          states[index],
          (value: any) => {
            states[index] = typeof value === "function" ? value(states[index]) : value;
          },
        ];
      },
      useRef(initial: any) {
        const index = refCursor++;
        return refs[index] ?? (refs[index] = { current: initial });
      },
      useCallback(callback: any) {
        return callback;
      },
      useEffect(run: () => void, deps: any[]) {
        const index = effectCursor++,
          prior = effects[index];
        if (!prior || deps.some((dep, i) => dep !== prior.deps[i])) {
          effects[index] = { run, deps, cleanup: prior?.cleanup };
          scheduled.push(index);
        }
      },
      getPreferenceValues: () => ({ configPath: "/private/config.json", portStart: "49120", portEnd: "49121" }),
      portRange: () => [49120, 49121],
      LocalStorage: {},
      errorText: () => "Bridge unavailable",
      ...globals,
    },
  );
  return {
    render(...args: any[]) {
      cursor = 0;
      refCursor = 0;
      effectCursor = 0;
      return exports[name]!(...args);
    },
    flush() {
      for (const index of scheduled.splice(0)) {
        const effect = effects[index]!;
        effect.cleanup?.();
        effect.cleanup = effect.run() || undefined;
      }
    },
    cleanup() {
      effects.forEach((effect) => effect.cleanup?.());
    },
  };
}
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test("all bridges load concurrently, isolate failures, watch their own cursors and close on refresh/unmount", async () => {
  const slow = deferred<{ sessions: any[]; cursor: number }>();
  const clients = new Map<string, any>();
  const loaded: string[] = [],
    changes = new Set<() => void>();
  const h = hookHarness("useBridges", {
    profiles: async () => ["fast", "slow", "broken"].map((id) => ({ id, name: id, configPath: `/${id}` })),
    onConnectionChange: (listener: () => void) => {
      changes.add(listener);
      return () => changes.delete(listener);
    },
    loadConnection: async (_storage: any, _path: string, id: string) => {
      loaded.push(id);
      if (id === "default") throw new Error("No default");
      return { profile: { id, name: id }, config: { url: id }, connectionKey: `key-${id}` };
    },
    Hub: class {
      closed = false;
      calls = 0;
      event?: () => void;
      reset?: () => Promise<number>;
      signal?: AbortSignal;
      cursor?: number;
      constructor(private config: { url: string }) {
        clients.set(config.url, this);
      }
      async sessions() {
        this.calls++;
        if (this.config.url === "broken") throw new Error("Offline");
        if (this.config.url === "slow") return slow.promise;
        return { sessions: [{ id: `fast-${this.calls}` }], cursor: this.calls };
      }
      async watch(
        cursor: number,
        signal: AbortSignal,
        event: () => void,
        reset: () => Promise<number>,
        status: (value: string) => void,
      ) {
        this.cursor = cursor;
        this.signal = signal;
        this.event = event;
        this.reset = reset;
        status("live");
      }
      close() {
        this.closed = true;
      }
    },
  });
  h.render();
  h.flush();
  await settle();
  let feed = h.render();
  assert.deepEqual(loaded.sort(), ["broken", "default", "fast", "slow"]);
  assert.equal(feed.loading, true, "slow bridge does not delay fast rows");
  assert.equal(feed.bridges.find((item: any) => item.profile.id === "fast").sessions[0].id, "fast-1");
  assert.equal(feed.bridges.find((item: any) => item.profile.id === "broken").error, "Bridge unavailable");
  assert.equal(feed.bridges.find((item: any) => item.profile.id === "broken").connection, "offline");
  assert.equal(feed.defaultUnavailable, true);
  assert.equal(feed.savedCount, 3);
  slow.resolve({ sessions: [{ id: "slow-session" }], cursor: 40 });
  await settle();
  feed = h.render();
  assert.equal(feed.loading, false);
  assert.equal(clients.get("fast").cursor, 1);
  assert.equal(clients.get("slow").cursor, 40);
  await clients.get("fast").reset();
  feed = h.render();
  assert.equal(feed.bridges.find((item: any) => item.profile.id === "fast").sessions[0].id, "fast-2");
  assert.equal(feed.bridges.find((item: any) => item.profile.id === "slow").sessions[0].id, "slow-session");
  clients.get("fast").event();
  feed.reconnect();
  assert.ok([...clients.values()].every((client) => client.closed));
  assert.equal(clients.get("fast").signal.aborted, true);
  await new Promise((resolve) => setTimeout(resolve, 220));
  assert.equal(clients.get("fast").calls, 2, "debounced refresh was canceled");
  h.cleanup();
  assert.equal(changes.size, 0);
});

test("aggregate cleanup ignores delayed config loads and sessions from the previous mount", async () => {
  const config = deferred<any>(),
    sessions = deferred<any>();
  const clients: any[] = [];
  const h = hookHarness("useBridges", {
    profiles: async () => [
      { id: "delayed", name: "Delayed", configPath: "/delayed" },
      { id: "fetching", name: "Fetching", configPath: "/fetching" },
    ],
    onConnectionChange: () => () => {},
    loadConnection: async (_storage: any, _path: string, id: string) => {
      if (id === "delayed") return config.promise;
      if (id === "default") throw new Error();
      return { config: { url: id }, connectionKey: id };
    },
    Hub: class {
      closed = false;
      constructor() {
        clients.push(this);
      }
      sessions() {
        return sessions.promise;
      }
      close() {
        this.closed = true;
      }
      watch() {
        assert.fail("unmounted feed cannot subscribe");
      }
    },
  });
  h.render();
  h.flush();
  await settle();
  const before = h.render();
  h.cleanup();
  config.resolve({ config: { url: "delayed" }, connectionKey: "delayed" });
  sessions.resolve({ sessions: [{ id: "late" }], cursor: 1 });
  await settle();
  const after = h.render();
  assert.equal(clients.length, 1);
  assert.equal(clients[0].closed, true);
  assert.equal(
    JSON.stringify(after.bridges),
    JSON.stringify(before.bridges),
    "late data cannot update unmounted state",
  );
});

test("pinned hub keeps its profile across active changes and rejects removal or identity drift before snapshot", async () => {
  for (const failure of ["removed", "changed"]) {
    const loads: string[] = [],
      clients: any[] = [],
      listeners = new Set<() => void>();
    let invalid = false;
    const h = hookHarness("useHub", {
      onConnectionChange: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      loadConnection: async (_storage: any, _path: string, id: string) => {
        loads.push(id);
        if (invalid && failure === "removed") throw new Error("Removed");
        return {
          profile: { id, name: "Server" },
          config: { url: "server" },
          connectionKey: invalid ? "other-key" : "server-key",
        };
      },
      Hub: class {
        closed = false;
        constructor() {
          clients.push(this);
        }
        async snapshot(id: string) {
          assert.equal(id, "same-binding");
          return { session: { id }, messages: [], cursor: 9 };
        }
        async watch(_cursor: number, _signal: AbortSignal, _event: any, _reset: any, status: (value: string) => void) {
          status("live");
        }
        close() {
          this.closed = true;
        }
      },
    });
    h.render("same-binding", "server", "server-key");
    h.flush();
    await settle();
    let feed = h.render("same-binding", "server", "server-key");
    assert.equal(feed.selected.profile.id, "server");
    assert.equal(feed.snapshot.session.id, "same-binding");
    // Changing the active selection emits the same signal as saving/removing a bridge.
    listeners.forEach((listener) => listener());
    assert.equal(clients[0].closed, true);
    h.render("same-binding", "server", "server-key");
    h.flush();
    await settle();
    feed = h.render("same-binding", "server", "server-key");
    assert.deepEqual(loads, ["server", "server"]);
    assert.equal(feed.profileId, "server");
    invalid = true;
    listeners.forEach((listener) => listener());
    h.render("same-binding", "server", "server-key");
    h.flush();
    await settle();
    feed = h.render("same-binding", "server", "server-key");
    assert.equal(clients.length, 2, "invalid connection must never receive a binding id");
    assert.equal(feed.hub.current, undefined);
    assert.equal(feed.snapshot, undefined);
    assert.equal(feed.connection, "offline");
    assert.ok(feed.error);
    h.cleanup();
    assert.equal(listeners.size, 0);
  }
});

test("reconnect aborts a pending pinned load immediately, before the next effect commits", async () => {
  const pending = deferred<any>();
  let client: any;
  const h = hookHarness("useHub", {
    onConnectionChange: () => () => {},
    loadConnection: async () => ({
      profile: { id: "server", name: "Server" },
      config: {},
      connectionKey: "server-key",
    }),
    Hub: class {
      closed = false;
      constructor() {
        client = this;
      }
      snapshot() {
        return pending.promise;
      }
      close() {
        this.closed = true;
      }
      watch() {
        assert.fail("old snapshot cannot start a watcher");
      }
    },
  });
  h.render("binding", "server", "server-key");
  h.flush();
  await settle();
  let feed = h.render("binding", "server", "server-key");
  feed.reconnect();
  pending.resolve({ session: { id: "stale" }, messages: [], cursor: 1 });
  await settle();
  feed = h.render("binding", "server", "server-key");
  assert.equal(client.closed, true);
  assert.equal(feed.snapshot, undefined);
  assert.equal(feed.hub.current, undefined);
  h.cleanup();
});
