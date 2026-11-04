import { strict as assert } from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { test, TestContext } from "node:test";
import { runInNewContext } from "node:vm";
import { Session } from "../src/core/types";
import { tempDir } from "./helpers";

// Exercise the real Raycast entry points, replacing only the unavailable host APIs.
const requireModule = createRequire(join(process.cwd(), "package.json"));
const { buildSync } = requireModule("esbuild") as typeof import("esbuild");
const code = buildSync({
  stdin: {
    contents: `
      export { default as command } from "./src/subscribe-current";
      export { subscribeCurrent } from "./src/lib/subscribe-current";
      export { store, refreshSessionTitles } from "./src/lib/sessions";
      export { readCodexDesktopSessions } from "./src/lib/codex-desktop";
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["@raycast/api", "@raycast/utils"],
  write: false,
}).outputFiles[0].text;

function runtime(t: TestContext, executeSQL: (path: string, sql: string) => Promise<unknown[]> = async () => []) {
  const root = tempDir(t);
  const state = join(root, "state");
  const catalog = join(root, "codex");
  mkdirSync(catalog);
  const failures: { error: Error; title: string }[] = [];
  const hud: string[] = [];
  let closes = 0;
  const api = {
    environment: { assetsPath: join(root, "assets"), ownerOrAuthorName: "test", extensionName: "agent-inbox" },
    getPreferenceValues: () => ({ notifications: false, contentSearchEnabled: false, resumeTerminal: "terminal" }),
    closeMainWindow: async () => {
      closes++;
    },
    showHUD: async (message: string) => {
      hud.push(message);
    },
  };
  const utils = {
    executeSQL,
    showFailureToast: async (error: Error, { title }: { title: string }) => {
      failures.push({ error, title });
    },
  };
  const module = { exports: {} };
  runInNewContext(code, {
    module,
    exports: module.exports,
    require: (id: string) => (id === "@raycast/api" ? api : id === "@raycast/utils" ? utils : requireModule(id)),
    process: { ...process, env: { ...process.env, AGENT_INBOX_HOME: state, CODEX_HOME: catalog } },
    Buffer,
    URL,
    setTimeout,
    clearTimeout,
  });
  return {
    state,
    catalog,
    failures,
    hud,
    closes: () => closes,
    app: module.exports as {
      command: typeof import("../src/subscribe-current").default;
      subscribeCurrent: typeof import("../src/lib/subscribe-current").subscribeCurrent;
      store: import("../src/core/db").Store;
      refreshSessionTitles: typeof import("../src/lib/sessions").refreshSessionTitles;
      readCodexDesktopSessions: typeof import("../src/lib/codex-desktop").readCodexDesktopSessions;
    },
  };
}

test("both subscription entry points report configuration write failures before closing Raycast", async (t) => {
  const r = runtime(t);
  writeFileSync(r.state, "a file blocks the configuration directory");
  for (const subscribe of [r.app.command, r.app.subscribeCurrent]) {
    await assert.doesNotReject(subscribe);
  }
  assert.equal(r.failures.length, 2);
  for (const failure of r.failures) {
    assert.match(failure.error.message, /EEXIST|ENOTDIR/);
    assert.equal(failure.title, "Couldn't subscribe to the current conversation");
  }
  assert.equal(r.closes(), 0);
  assert.deepEqual(r.hud, [], "a failed configuration must not report success");
});

test("Raycast catalog reads and title refreshes use executeSQL", async (t) => {
  const queries: { path: string; sql: string }[] = [];
  const r = runtime(t, async (path, sql) => {
    queries.push({ path, sql });
    return sql.startsWith("PRAGMA") ? [{ name: "id" }, { name: "title" }] : [{ id: "one", name: "Renamed" }];
  });
  const path = join(r.catalog, "state_42.sqlite");
  // Only the host helper can read this catalog; a raw sqlite3 fallback would fail.
  writeFileSync(path, "not a sqlite database");
  const [entry] = await r.app.readCodexDesktopSessions();
  assert.equal(entry.title, "Renamed");
  const session: Session = {
    ...entry,
    title: "Old name",
    locator: {},
    status: "idle",
    attention: null,
    subscribed: true,
    handledAt: null,
  };
  await r.app.store.put(session);
  const [updated] = await r.app.refreshSessionTitles([session]);
  assert.equal(updated.title, "Renamed");
  assert.equal((await r.app.store.get("codex", "one"))!.title, "Renamed");
  assert.equal(queries.length, 4, "schema and data queries must both use the host helper on each read");
  assert.ok(queries.every((query) => query.path === path));
});

test("an unavailable Raycast catalog retains the legacy index fallback", async (t) => {
  const r = runtime(t, async () => {
    throw new Error("catalog is locked");
  });
  writeFileSync(join(r.catalog, "state_42.sqlite"), "");
  writeFileSync(join(r.catalog, "session_index.jsonl"), JSON.stringify({ id: "one", thread_name: "Index name" }));
  const [entry] = await r.app.readCodexDesktopSessions();
  assert.equal(entry.title, "Index name");
});
