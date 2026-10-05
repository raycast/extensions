import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTabs, selectTab } from "../../src/lib/tabs/load.ts";
import { fromSnapshot, herdr, herdrPlaceKey } from "../../src/lib/tabs/sources/herdr.ts";
import { herdrClient } from "../../src/lib/platform/processes.ts";
import { app, fakePlatform } from "../fake-platform.ts";
import { proc } from "../agents/helpers.ts";

const ghostty = { ...app("com.mitchellh.ghostty", "Ghostty"), pid: 50 };
const snapshot = {
  focused_workspace_id: "w1",
  focused_tab_id: "w1:t1",
  workspaces: [
    { workspace_id: "w1", label: "hopper", number: 1 },
    { workspace_id: "w2", label: "", number: 2 },
  ],
  tabs: [
    { tab_id: "w1:t1", workspace_id: "w1", label: "agents" },
    { tab_id: "w2:t1", workspace_id: "w2", label: "1" },
  ],
  panes: [{ pane_id: "w1:p1", tab_id: "w1:t1", foreground_cwd: "/p/hopper" }],
};

test("herdr: every workspace, then its tabs that have their own name, under the terminal running herdr", () => {
  const tabs = fromSnapshot(ghostty, "/s", snapshot);
  assert.deepEqual(
    tabs.map((t) => [t.key, t.app.name, t.kind, t.title, t.detail, t.active]),
    [
      ["herdr:/s:w1", "Ghostty", "workspace", "hopper", "herdr", true],
      ["herdr:/s:w1:t1", "Ghostty", "tab", "agents", "herdr › hopper", true],
      ["herdr:/s:w2", "Ghostty", "workspace", "Workspace 2", "herdr", false],
    ],
  );
  // An agent's status goes on its tab's entry, or its workspace's when the tab has none.
  assert.equal(herdrPlaceKey(snapshot, "/s", "w1:t1"), "herdr:/s:w1:t1");
  assert.equal(herdrPlaceKey(snapshot, "/s", "w2:t1"), "herdr:/s:w2");
});

test("discovered through the herdr client's terminal; selecting focuses the tab in herdr", async () => {
  const requests: string[] = [];
  const platform = fakePlatform({
    listDir: async (dir) => (dir.endsWith(".config/herdr") ? ["herdr.sock"] : []),
    socketRequest: async (_path, request) => {
      const { method, params } = request as { method: string; params: object };
      requests.push(`${method} ${JSON.stringify(params)}`);
      return method === "session.snapshot" ? { id: "hopper", result: { snapshot } } : { id: "hopper", result: {} };
    },
    // Ghostty (50) → login (51, root) → zsh (52) → herdr client (53); herdr server (54) has no tty.
    processes: async () => [
      proc(51, 50, "ttys001", "login"),
      proc(52, 51, "ttys001", "zsh"),
      proc(53, 52, "ttys001", "herdr"),
      proc(54, 53, "", "herdr"),
    ],
    accessibilityTrusted: async () => true,
    windows: async () => [],
  });
  const { tabs } = await loadTabs([ghostty], platform);
  assert.deepEqual(
    tabs.filter((t) => t.source === "herdr").map((t) => t.title),
    ["hopper", "agents", "Workspace 2"],
  );
  await selectTab(
    tabs.find((t) => t.title === "Workspace 2")!,
    platform,
  );
  // Ghostty doesn't report ttys: herdr titles its terminal with a marker, Ghostty's terminal with it is focused.
  const [focusTab, setTitle, clearTitle] = requests.slice(-3);
  assert.equal(focusTab, 'workspace.focus {"workspace_id":"w2"}');
  const marker = /"title":"(hopper-[^"]+)"/.exec(setTitle)?.[1];
  assert.ok(marker && setTitle.startsWith("client.window_title.set"));
  assert.equal(clearTitle, "client.window_title.clear {}");
  assert.ok(platform.scripts.some((s) => s.includes(`(name of term as text) is "${marker}"`)));
});

test("each herdr session is listed under the terminal of its own client; a detached one isn't listed", async () => {
  const iterm = { ...app("com.googlecode.iterm2", "iTerm"), pid: 60 };
  const dir = "/Users/me/.config/herdr";
  const snapshots: Record<string, object> = {
    [`${dir}/herdr.sock`]: { workspaces: [{ workspace_id: "w1", label: "default-ws" }] },
    [`${dir}/sessions/work/herdr.sock`]: { workspaces: [{ workspace_id: "w1", label: "work-ws" }] },
    [`${dir}/sessions/idle/herdr.sock`]: { workspaces: [{ workspace_id: "w1", label: "idle-ws" }] },
  };
  const platform = fakePlatform({
    listDir: async (path) =>
      path === dir ? ["herdr.sock"] : path === `${dir}/sessions` ? ["work", "idle"] : ["herdr.sock"],
    socketRequest: async (path) => ({ id: "hopper", result: { snapshot: snapshots[path] } }),
    processes: async () => [
      // The default session's client in Ghostty; the newer one in iTerm is attached to "work"; "idle" has none.
      proc(53, 50, "ttys001", "herdr", { startedAt: 1, sockets: [`${dir}/herdr-client.sock`] }),
      proc(63, 60, "ttys004", "herdr", { startedAt: 2, sockets: [`${dir}/sessions/work/herdr-client.sock`] }),
    ],
  });
  const tabs = await herdr.discover!([ghostty, iterm], platform);
  assert.deepEqual(
    tabs.map((t) => [t.title, t.app.name, t.hostTty]),
    [
      ["default-ws", "Ghostty", "ttys001"],
      ["work-ws", "iTerm", "ttys004"],
    ],
  );
});

test("herdr clients whose connections can't be read: the most recent client hosts every session", async () => {
  const processes = [proc(53, 50, "ttys001", "herdr", { startedAt: 1 }), proc(63, 60, "ttys004", "herdr", { startedAt: 2 })];
  assert.equal(herdrClient(processes, "/h/sessions/work/herdr.sock")?.pid, 63);
});

test("herdr not running or no client in a known terminal: nothing listed", async () => {
  const platform = fakePlatform({
    listDir: async () => ["herdr.sock"],
    socketRequest: async () => {
      throw new Error("ECONNREFUSED");
    },
  });
  assert.deepEqual(await herdr.discover!([ghostty], platform), []);
});

test("herdr running without a socket, or answering without a snapshot, is reported", async () => {
  const noSocket = fakePlatform({ processes: async () => [proc(40, 1, "", "herdr")] });
  assert.deepEqual(await herdr.discover!([ghostty], noSocket), []);
  const noSnapshot = fakePlatform({
    listDir: async (dir) => (dir.endsWith(".config/herdr") ? ["herdr.sock"] : []),
    socketRequest: async () => ({ result: { state: {} } }),
  });
  assert.deepEqual(await herdr.discover!([ghostty], noSnapshot), []);
  assert.deepEqual(
    [...noSocket.reports, ...noSnapshot.reports].map((r) => [r.context, (r.error as Error).message]),
    [
      ["tabs: herdr socket", "herdr runs but has no herdr.sock"],
      ["tabs: herdr snapshot", "herdr's session.snapshot has no snapshot"],
    ],
  );
});

test("a herdr tab in iTerm also selects the iTerm split running herdr", async () => {
  const iterm = { ...app("com.googlecode.iterm2", "iTerm"), pid: 60 };
  const scripts: string[] = [];
  const platform = fakePlatform({
    listDir: async (dir) => (dir.endsWith(".config/herdr") ? ["herdr.sock"] : []),
    socketRequest: async () => ({ id: "hopper", result: { snapshot } }),
    processes: async () => [proc(61, 60, "ttys007", "login"), proc(62, 61, "ttys007", "herdr")],
    runAppleScript: async (script) => {
      scripts.push(script);
      return script.includes("sessions of t\n") || script.includes("repeat with p in sessions")
        ? `1\u001fS-1\u001fzsh\u001ftrue\u001fS-1=/dev/ttys006,S-2=/dev/ttys007,\u001e`
        : "ok";
    },
  });
  const { tabs } = await loadTabs([iterm], platform);
  const place = tabs.find((t) => t.title === "agents")!;
  assert.deepEqual(
    [place.app.name, place.within?.tab.key, place.within?.paneId],
    ["iTerm", "com.googlecode.iterm2:S-1", "S-2"],
  );
  await selectTab(place, platform);
  assert.match(scripts.at(-1)!, /if \(id of s\) is "S-2" then/);
});

test("selecting a pane of a herdr tab (an agent's) focuses it in herdr, then the terminal split holding herdr", async () => {
  const iterm = { ...app("com.googlecode.iterm2", "iTerm"), pid: 60 };
  const calls: string[] = [];
  const platform = fakePlatform({
    listDir: async (dir) => (dir.endsWith(".config/herdr") ? ["herdr.sock"] : []),
    socketRequest: async (_path, request) => {
      const { method, params } = request as { method: string; params: object };
      if (method !== "session.snapshot") calls.push(`${method} ${JSON.stringify(params)}`);
      return { id: "hopper", result: method === "session.snapshot" ? { snapshot } : {} };
    },
    processes: async () => [proc(61, 60, "ttys007", "login"), proc(62, 61, "ttys007", "herdr")],
    runAppleScript: async (script) => {
      if (/is "S-2" then/.test(script)) calls.push("select S-2");
      return script.includes("repeat with p in sessions")
        ? `1\u001fS-1\u001fzsh\u001ftrue\u001fS-1=/dev/ttys006,S-2=/dev/ttys007,\u001e`
        : "ok";
    },
  });
  const { tabs } = await loadTabs([iterm], platform);
  await selectTab(tabs.find((t) => t.title === "agents")!, platform, "w1:p1");
  assert.deepEqual(calls, ['pane.focus {"pane_id":"w1:p1"}', "select S-2"]);
});
