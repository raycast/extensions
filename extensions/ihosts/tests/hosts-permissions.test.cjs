const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const test = require("node:test");
const ts = require("typescript");

const sourceRoot = path.resolve(__dirname, "../src");
function loadSource(name, overrides) {
  const filename = path.join(sourceRoot, name);
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2021,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  const module = { exports: {} };
  vm.runInNewContext(
    outputText,
    {
      module,
      exports: module.exports,
      Buffer,
      require(id) {
        if (Object.hasOwn(overrides, id)) return overrides[id];
        if (id.startsWith(".")) throw new Error(`Unmocked application import: ${id}`);
        return require(id);
      },
    },
    { filename }
  );
  return module.exports;
}

function permissionHarness(options = {}) {
  const state = {
    mode: 0o644,
    uid: 0,
    gid: 0,
    regular: true,
    writable: false,
    calls: [],
    username: "fixture-user",
    requesterUid: 501,
    ...options,
  };
  const permissions = loadSource("utils/permissions.ts", {
    "../const": { SystemHostFilePath: "/fixture-only/hosts" },
    "node:os": { userInfo: () => ({ username: state.username, uid: state.requesterUid }) },
    "node:fs": {
      constants: fs.constants,
      lstatSync: () => ({ ...state, isFile: () => state.regular }),
      accessSync: () => {
        if (!state.writable) throw new Error("EACCES");
      },
    },
    "run-applescript": {
      runAppleScript: async (script) => {
        state.calls.push(script);
        if (state.run) return state.run(script, state);
        Object.assign(state, { mode: 0o644, uid: 0, gid: 0, writable: true });
        return "granted";
      },
    },
  });
  return { state, permissions };
}

test("native permission request targets the unelevated account and verifies the grant", async () => {
  const { state, permissions } = permissionHarness();
  await permissions.getSysHostAccess();
  assert.equal(state.calls.length, 1);
  assert.match(state.calls[0], /user:fixture-user allow read,write/);
  assert.match(state.calls[0], /with administrator privileges with prompt/);
  assert.match(state.calls[0], /\/usr\/sbin\/chown root:wheel/);
  assert.match(state.calls[0], /\/bin\/chmod 0644/);
  assert.match(state.calls[0], /quoted form of accountAccess/);
  assert.match(state.calls[0], /\/bin\/test ! -L/);
  assert.doesNotMatch(state.calls[0], /777|password\s+"|user name\s+"|sudo/);
  assert.equal(permissions.checkSysHostAccess(), true);
});

test("legacy 0777 is repaired even when accessSync says writable", async () => {
  const { state, permissions } = permissionHarness({ mode: 0o777, writable: true });
  assert.equal(permissions.checkSysHostAccess(), false);
  await permissions.getSysHostAccess();
  assert.equal(state.calls.length, 1);
  assert.equal(state.mode, 0o644);
});

test("safe current-user access avoids another authentication request", async () => {
  const { state, permissions } = permissionHarness({ writable: true });
  await permissions.getSysHostAccess();
  assert.equal(state.calls.length, 0);
});

test("unsafe owner, group, type, or mode is never accepted as enabled", () => {
  for (const options of [{ uid: 501 }, { gid: 20 }, { regular: false }, { mode: 0o664 }, { mode: 0o4644 }]) {
    const { permissions } = permissionHarness({ writable: true, ...options });
    assert.equal(permissions.checkSysHostAccess(), false);
  }
});

test("cancellation stays disabled and can be retried", async () => {
  const { state, permissions } = permissionHarness({ run: async () => "cancelled" });
  await assert.rejects(permissions.getSysHostAccess(), (error) => {
    assert.match(permissions.getSysHostPermissionErrorMessage(error), /cancelled/);
    return true;
  });
  assert.equal(permissions.checkSysHostAccess(), false);
  state.run = undefined;
  await permissions.getSysHostAccess();
  assert.equal(state.calls.length, 2);
  assert.equal(permissions.checkSysHostAccess(), true);
});

test("authorization failure never reports enabled access or exposes raw errors", async () => {
  const { permissions } = permissionHarness({
    run: async () => {
      throw new Error("private diagnostic");
    },
  });
  await assert.rejects(permissions.getSysHostAccess(), (error) => {
    assert.doesNotMatch(permissions.getSysHostPermissionErrorMessage(error), /private diagnostic/);
    return true;
  });
  assert.equal(permissions.checkSysHostAccess(), false);
});

test("a successful AppleScript result without actual access is rejected", async () => {
  const { permissions } = permissionHarness({ run: async () => "granted" });
  await assert.rejects(permissions.getSysHostAccess(), /did not grant safe write access/);
});

test("concurrent enable actions share one authentication request", async () => {
  let complete;
  const { state, permissions } = permissionHarness({
    run: () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  });
  const first = permissions.getSysHostAccess();
  const second = permissions.getSysHostAccess();
  assert.equal(first, second);
  assert.equal(state.calls.length, 1);
  state.writable = true;
  complete("granted");
  await Promise.all([first, second]);
});

test("root is not mistaken for the requesting desktop account", async () => {
  const { state, permissions } = permissionHarness({ requesterUid: 0 });
  await assert.rejects(permissions.getSysHostAccess(), /regular macOS account/);
  assert.equal(state.calls.length, 0);
});

test(
  "generated native script compiles, including quoted account names, without execution",
  { skip: process.platform !== "darwin" },
  async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ihosts-script-test-"));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const { state, permissions } = permissionHarness({ username: 'fixture"\\name\n$(touch should-not-run)' });
    await permissions.getSysHostAccess();
    const script = path.join(dir, "permission.applescript");
    fs.writeFileSync(script, state.calls[0]);
    execFileSync("/usr/bin/osacompile", ["-o", path.join(dir, "permission.scpt"), script], { stdio: "pipe" });
    assert.ok(fs.existsSync(path.join(dir, "permission.scpt")));
  }
);

test(
  "macOS accepts the account-specific ACL without widening standard file permissions",
  { skip: process.platform !== "darwin" },
  (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ihosts-acl-test-"));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const target = path.join(dir, "hosts-fixture");
    fs.writeFileSync(target, "fixture only", { mode: 0o644 });
    const owner = fs.statSync(target).uid;
    const username = os.userInfo().username;
    execFileSync("/bin/chmod", ["+a", `user:${username} allow read,write`, target]);
    const acl = execFileSync("/bin/ls", ["-le", target], { encoding: "utf8" });
    assert.ok(acl.includes(`user:${username} allow read,write`));
    assert.equal(fs.statSync(target).mode & 0o7777, 0o644);
    assert.equal(fs.statSync(target).uid, owner);
  }
);

function writerHarness(t, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ihosts-write-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const target = path.join(dir, "hosts");
  fs.writeFileSync(target, "original fixture contents\n", { mode: 0o644 });
  const state = { granted: false, permissionCalls: 0, opens: 0, closes: 0, ...options };
  const permissions = {
    checkSysHostAccess: () => state.granted,
    getSysHostAccess: async () => {
      state.permissionCalls++;
      if (state.cancel) throw new Error("cancelled");
      state.granted = true;
    },
    isSafeSystemHostsFile: (stats) =>
      stats.isFile() && stats.uid === 0 && stats.gid === 0 && (stats.mode & 0o7777) === 0o644,
    getSysHostPermissionErrorMessage: () => "Permission request cancelled.",
  };
  const files = loadSource("utils/file.ts", {
    "../const": { SystemHostFilePath: target },
    "./permissions": permissions,
    "@raycast/api": { getPreferenceValues: () => ({}) },
    "node:fs": {
      ...fs,
      openSync(filename, flags) {
        assert.equal(filename, target);
        assert.ok(flags & fs.constants.O_NOFOLLOW);
        assert.equal(flags & fs.constants.O_TRUNC, 0);
        state.opens++;
        return fs.openSync(filename, flags);
      },
      fstatSync(fd) {
        const stats = fs.fstatSync(fd);
        return { ...stats, uid: state.changedOwner ? 501 : 0, gid: 0, isFile: () => stats.isFile() };
      },
      closeSync(fd) {
        state.closes++;
        fs.closeSync(fd);
      },
    },
  });
  return { target, dir, state, files, permissions };
}

test("writer authorizes before opening, writes Unicode, and removes trailing old data", async (t) => {
  const { files, state, target } = writerHarness(t);
  await files.writeSysHostFile("# café\n");
  assert.equal(state.permissionCalls, 1);
  assert.equal(fs.readFileSync(target, "utf8"), "# café\n");
  assert.equal(state.opens, state.closes);
});

test("cancelled writer never opens or changes the hosts target", async (t) => {
  const { files, state, target } = writerHarness(t, { cancel: true });
  await assert.rejects(files.writeSysHostFile("replacement"), /cancelled/);
  assert.equal(state.opens, 0);
  assert.equal(fs.readFileSync(target, "utf8"), "original fixture contents\n");
});

test("writer refuses a symlink without changing the link target", async (t) => {
  const { files, state, target, dir } = writerHarness(t, { granted: true });
  const victim = path.join(dir, "victim");
  fs.writeFileSync(victim, "unchanged victim");
  fs.unlinkSync(target);
  fs.symlinkSync(victim, target);
  await assert.rejects(files.writeSysHostFile("replacement"));
  assert.equal(fs.readFileSync(victim, "utf8"), "unchanged victim");
  assert.equal(state.closes, 0);
});

test("writer rechecks opened-file ownership before changing any bytes", async (t) => {
  const { files, state, target } = writerHarness(t, { granted: true, changedOwner: true });
  await assert.rejects(files.writeSysHostFile("replacement"), /permissions changed/);
  assert.equal(fs.readFileSync(target, "utf8"), "original fixture contents\n");
  assert.equal(state.closes, 1);
});

function uiHarness(overrides) {
  const state = [];
  let cursor = 0;
  const runtime = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  const component = (name) => Object.assign(() => {}, { displayName: name });
  const raycast = {
    Detail: component("Detail"),
    ActionPanel: Object.assign(component("ActionPanel"), { Section: component("Section") }),
    Action: Object.assign(component("Action"), { Push: component("Push") }),
    MenuBarExtra: Object.assign(component("MenuBarExtra"), {
      Item: component("Item"),
      Separator: component("Separator"),
    }),
    List: Object.assign(component("List"), { Item: Object.assign(component("Item"), { Detail: component("Detail") }) }),
    Color: {},
    Icon: {},
    Toast: { Style: { Success: "success" } },
    showToast: async () => {},
    showHUD: async () => {},
    ...overrides,
  };
  return {
    state,
    overrides: {
      "react/jsx-runtime": runtime,
      react: {
        useState(initial) {
          const index = cursor++;
          if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
          return [
            state[index],
            (value) => {
              state[index] = value;
            },
          ];
        },
        useEffect() {},
      },
      "@raycast/api": raycast,
    },
    render(fn, props) {
      cursor = 0;
      return fn(props);
    },
  };
}

function findAction(tree, title) {
  if (!tree || typeof tree !== "object") return;
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const found = findAction(child, title);
      if (found) return found;
    }
    return;
  }
  if (tree.props?.title === title && tree.props.onAction) return tree.props.onAction;
  for (const child of [tree.props?.actions, ...[tree.props?.children].flat()]) {
    const found = findAction(child, title);
    if (found) return found;
  }
}

test("main permission screen stays open on cancellation and enables only after a grant", async () => {
  const ui = uiHarness();
  let cancel = true;
  let granted = 0;
  const components = loadSource("component.tsx", {
    ...ui.overrides,
    "./const": { SystemHostFilePath: "/fixture-only/hosts" },
    "./utils/file": {
      getSysHostAccess: async () => {
        if (cancel) throw new Error("cancelled");
      },
      getSysHostPermissionErrorMessage: () => "Permission request cancelled. Try again.",
    },
    "raycast-toolkit": {},
  });
  const render = () =>
    ui.render(components.SysHostPermRequest, {
      onGranted: () => {
        granted++;
      },
    });
  await findAction(render(), "Enable Hosts Access")();
  assert.equal(granted, 0);
  assert.match(render().props.markdown, /cancelled/);
  assert.equal(render().props.isLoading, false);
  cancel = false;
  await findAction(render(), "Enable Hosts Access")();
  assert.equal(granted, 1);
});

test("menu-bar permission action refreshes to the hosts menu after authorization", async () => {
  const ui = uiHarness();
  let requests = 0;
  const command = loadSource("switch.tsx", {
    ...ui.overrides,
    "./component": {},
    "./const": {},
    "./utils/common": { getHostCommonsCache: () => [] },
    "./utils/file": {
      checkSysHostAccess: () => false,
      getSysHostAccess: async () => {
        requests++;
      },
    },
  }).default;
  await findAction(ui.render(command), "Enable Hosts Access")();
  assert.equal(requests, 1);
  assert.equal(findAction(ui.render(command), "Enable Hosts Access"), undefined);
  assert.equal(ui.state[0], false);
});

test("main command transitions from permission screen without changing hook order", () => {
  const ui = uiHarness();
  const command = loadSource("ihosts.tsx", {
    ...ui.overrides,
    "./component": { SysHostPermRequest: () => {}, SystemHostsActions: () => null },
    "./const": {},
    "./utils/common": {},
    "./utils/file": { checkSysHostAccess: () => false, getSysHostFile: () => "", getShowHost: (x) => x },
    uuid: {},
  }).default;
  const permissionScreen = ui.render(command);
  const count = ui.state.length;
  permissionScreen.props.onGranted();
  const hostsScreen = ui.render(command);
  assert.notEqual(hostsScreen.type, permissionScreen.type);
  assert.equal(ui.state.length, count);
});

test("menu-bar switch waits for remote hosts before writing the target", async () => {
  const ui = uiHarness();
  let finishFetch;
  let written;
  const host = { id: "remote", name: "Remote", state: "Disabled", isRemote: true, url: "https://fixture.invalid" };
  const command = loadSource("switch.tsx", {
    ...ui.overrides,
    "./component": { getItemIcon: () => ({}) },
    "./const": { State: { Enable: "Enabled", Disable: "Disabled" }, HostFolderMode: {} },
    "./utils/common": { getHostCommonsCache: () => [host], saveHostCommons: async () => {} },
    "./utils/file": {
      checkSysHostAccess: () => true,
      getContentFromUrl: () =>
        new Promise((resolve) => {
          finishFetch = resolve;
        }),
      writeSysHostFile: async (content) => {
        written = content;
      },
      getSysHostFileHash: () => "fixture-hash",
    },
    "@raycast/api": { ...ui.overrides["@raycast/api"], LocalStorage: { setItem: async () => {} } },
  }).default;
  const switching = findAction(ui.render(command), "Remote")();
  assert.equal(written, undefined);
  finishFetch("127.0.0.2 remote.fixture");
  await switching;
  assert.match(written, /127\.0\.0\.2 remote\.fixture/);
});

function loadUpdate(overrides) {
  return loadSource("update.tsx", {
    "./const": { State: { Enable: "Enabled" }, SystemHostHashKey: "fixture-hash-key" },
    ...overrides,
  }).default;
}

test("update uses persisted hosts and obtains permission before writing", async (t) => {
  const { files, target, state } = writerHarness(t);
  const command = loadUpdate({
    "@raycast/api": { showHUD: async () => {}, LocalStorage: { setItem: async () => {} } },
    "./utils/common": {
      getHostCommons: async () => [{ name: "Persisted", state: "Enabled", content: "127.0.0.3 persisted.fixture" }],
    },
    "./utils/file": { ...files, getSysHostFileHash: () => "fixture-hash" },
  });
  await command();
  assert.equal(state.permissionCalls, 1);
  assert.match(fs.readFileSync(target, "utf8"), /persisted\.fixture/);
});

test("update cancellation preserves the target and does not announce success", async (t) => {
  const { files, target } = writerHarness(t, { cancel: true });
  const messages = [];
  const command = loadUpdate({
    "@raycast/api": {
      showHUD: async (message) => messages.push(message),
      LocalStorage: { setItem: async () => assert.fail("must not save hash") },
    },
    "./utils/common": { getHostCommons: async () => [{ name: "Fixture", state: "Enabled", content: "new" }] },
    "./utils/file": files,
  });
  await command();
  assert.deepEqual(messages, ["Permission request cancelled."]);
  assert.equal(fs.readFileSync(target, "utf8"), "original fixture contents\n");
});

test("update with no saved hosts neither prompts nor clears the target", async () => {
  let message;
  const command = loadUpdate({
    "@raycast/api": {
      showHUD: async (value) => {
        message = value;
      },
    },
    "./utils/common": { getHostCommons: async () => [] },
    "./utils/file": {
      getSysHostAccess: () => assert.fail("must not prompt"),
      writeSysHostFile: () => assert.fail("must not write"),
    },
  });
  await command();
  assert.match(message, /No saved hosts/);
});
