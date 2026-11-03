import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildLaunch,
  checkReadiness,
  compareVersions,
  helperPath,
  parseOverride,
  parseSettings,
  type Access,
  type System,
} from "../src/digup/installation";

const HOME = "/Users/sam";
const INDEX = "/Users/sam/Library/Application Support/DigUp/index.noindex";

function plist(body: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0">\n<dict>${body}</dict>\n</plist>`;
}

const SETTINGS = plist(`
  <key>roots</key><array><string>/Users/sam/Documents/Tax &amp; Legal</string><string>~/Downloads</string></array>
  <key>excludedFolders</key><array><string>/Users/sam/Downloads/old stuff</string></array>
  <key>excludedTypes</key><array><string>heic,.TXT</string><string>mov</string></array>
  <key>codeRoots</key><array><string>/Users/sam/Code/billing-service</string></array>
  <key>codeExcludedFolders</key><array><string>/Users/sam/Code/billing-service/vendor</string></array>
  <key>codeEditor</key><string>dev.zed.Zed</string>
  <key>modelsDir</key><string>/Volumes/Fast/Models</string>`);

test("settings are read with paths expanded and extensions normalized", () => {
  assert.deepEqual(parseSettings(SETTINGS, HOME), {
    indexDir: INDEX,
    modelsDir: "/Volumes/Fast/Models",
    roots: ["/Users/sam/Documents/Tax & Legal", "/Users/sam/Downloads"],
    excludedFolders: ["/Users/sam/Downloads/old stuff"],
    excludedTypes: ["heic", "txt", "mov"],
    codeRoots: ["/Users/sam/Code/billing-service"],
    codeExcludedFolders: ["/Users/sam/Code/billing-service/vendor"],
    codeEditor: "dev.zed.Zed",
  });
});

test("with no settings yet, everything is empty and the index is where DigUp keeps it", () => {
  for (const xml of [plist(""), "", "garbage"]) {
    assert.deepEqual(parseSettings(xml, HOME), {
      indexDir: INDEX,
      roots: [],
      excludedFolders: [],
      excludedTypes: [],
      codeRoots: [],
      codeExcludedFolders: [],
    });
  }
});

test("an index folder set in DigUp is used; an editor set to the default app stays an empty string", () => {
  const settings = parseSettings(
    plist("<key>indexDir</key><string>~/Indexes/digup</string><key>codeEditor</key><string></string>"),
    HOME,
  );
  assert.equal(settings.indexDir, "/Users/sam/Indexes/digup");
  assert.equal(settings.codeEditor, "");
});

test("excluded types saved as one string are read too", () => {
  assert.deepEqual(parseSettings(plist("<key>excludedTypes</key><string>HEIC, .png</string>"), HOME).excludedTypes, [
    "heic",
    "png",
  ]);
});

test("the development override accepts only the three keys it is for", () => {
  assert.deepEqual(parseOverride('{"indexDir":"~/idx","roots":["~/Samples"],"codeRoots":[],"codeEditor":"x"}', HOME), {
    indexDir: "/Users/sam/idx",
    roots: ["/Users/sam/Samples"],
    codeRoots: [],
  });
  assert.deepEqual(parseOverride("not json", HOME), {});
  assert.deepEqual(parseOverride('{"roots":"oops","indexDir":7}', HOME), {});
});

test("versions compare by their numbers, not as text", () => {
  assert.equal(compareVersions("0.6.1", "0.6.1"), 0);
  assert.equal(compareVersions("0.6.0", "0.6.1"), -1);
  assert.equal(compareVersions("0.10.0", "0.6.1"), 1);
  assert.equal(compareVersions("1", "0.6.1"), 1);
  assert.equal(compareVersions("0.6", "0.6.1"), -1);
  assert.equal(compareVersions("0.6.1-beta", "0.6.1"), 0);
});

test("the helper is started with DigUp's folders, each path one argument whatever it contains", () => {
  const launch = buildLaunch("/Applications/DigUp.app", parseSettings(SETTINGS, HOME), true);
  assert.equal(launch.program, "/Applications/DigUp.app/Contents/Helpers/digup");
  assert.deepEqual(launch.args, [
    "search-service",
    "/Users/sam/Documents/Tax & Legal",
    "/Users/sam/Downloads",
    "--index",
    INDEX,
    "--exclude",
    "/Users/sam/Downloads/old stuff",
    "--exclude-ext",
    "heic",
    "--exclude-ext",
    "txt",
    "--exclude-ext",
    "mov",
    "--code-root",
    "/Users/sam/Code/billing-service",
    "--code-exclude",
    "/Users/sam/Code/billing-service/vendor",
  ]);
  assert.deepEqual(launch.env, { DIGUP_MODELS: "/Volumes/Fast/Models" });
});

test("without a code index, the helper is not told about code folders", () => {
  const launch = buildLaunch("/Applications/DigUp.app", parseSettings(SETTINGS, HOME), false);
  assert.equal(launch.args.includes("--code-root"), false);
  assert.equal(launch.args.includes("--code-exclude"), false);
  assert.deepEqual(buildLaunch("/Applications/DigUp.app", parseSettings("", HOME), false).env, {});
});

function system(overrides: Partial<System> & { files?: string[]; folders?: Record<string, Access> } = {}): System {
  const files = overrides.files ?? ["/Applications/DigUp.app", `${INDEX}/index.sqlite`];
  return {
    home: HOME,
    exists: async (path) => files.includes(path),
    isExecutable: async (path) => path === helperPath("/Applications/DigUp.app"),
    version: async () => "0.6.1",
    exportDefaults: async () => SETTINGS,
    access: async (folder) => overrides.folders?.[folder] ?? "ok",
    ...overrides,
  };
}

test("DigUp that isn't anywhere is not installed", async () => {
  assert.deepEqual(await checkReadiness([], system({ files: [] })), { state: "not-installed" });
});

test("the app Raycast found is preferred; the usual folders are tried after it", async () => {
  const elsewhere = "/Volumes/Apps/DigUp.app";
  const found = await checkReadiness(
    [elsewhere],
    system({ files: [elsewhere, "/Applications/DigUp.app", `${INDEX}/index.sqlite`], isExecutable: async () => true }),
  );
  assert.equal(found.state === "ready" && found.appPath, elsewhere);
  const home = await checkReadiness(
    [],
    system({ files: ["/Users/sam/Applications/DigUp.app", `${INDEX}/index.sqlite`], isExecutable: async () => true }),
  );
  assert.equal(home.state === "ready" && home.appPath, "/Users/sam/Applications/DigUp.app");
});

test("an older DigUp, or one without its helper, is outdated", async () => {
  assert.deepEqual(await checkReadiness([], system({ version: async () => "0.6.0" })), {
    state: "outdated",
    appPath: "/Applications/DigUp.app",
    version: "0.6.0",
  });
  assert.equal((await checkReadiness([], system({ isExecutable: async () => false }))).state, "outdated");
  assert.equal((await checkReadiness([], system({ version: async () => undefined }))).state, "outdated");
});

test("without index.sqlite there is no index, so the helper never gets to create an empty one", async () => {
  assert.deepEqual(await checkReadiness([], system({ files: ["/Applications/DigUp.app"] })), {
    state: "no-index",
    appPath: "/Applications/DigUp.app",
  });
});

test("a folder Raycast may not read stops it; a folder that isn't there does not", async () => {
  assert.deepEqual(await checkReadiness([], system({ folders: { "/Users/sam/Downloads": "denied" } })), {
    state: "no-access",
    appPath: "/Applications/DigUp.app",
    folder: "/Users/sam/Downloads",
  });
  assert.equal((await checkReadiness([], system({ folders: { "/Users/sam/Downloads": "missing" } }))).state, "ready");
});

test("when everything is there it is ready, with code only when the code index exists", async () => {
  const plain = await checkReadiness([], system());
  assert.equal(plain.state === "ready" && plain.hasCode, false);
  assert.equal(plain.state === "ready" && plain.launch.args.includes("--code-root"), false);
  const withCode = await checkReadiness(
    [],
    system({ files: ["/Applications/DigUp.app", `${INDEX}/index.sqlite`, `${INDEX}/code.sqlite`] }),
  );
  assert.equal(withCode.state === "ready" && withCode.hasCode, true);
  assert.equal(withCode.state === "ready" && withCode.launch.args.includes("--code-root"), true);
  assert.equal(withCode.state === "ready" && withCode.version, "0.6.1");
});

test("the development override replaces the index and the folders", async () => {
  const ready = await checkReadiness(
    [],
    system({ files: ["/Applications/DigUp.app", "/tmp/idx/index.sqlite"] }),
    { indexDir: "/tmp/idx", roots: ["/Users/sam/Samples"] },
  );
  assert.equal(ready.state === "ready" && ready.settings.indexDir, "/tmp/idx");
  assert.deepEqual(ready.state === "ready" && ready.settings.roots, ["/Users/sam/Samples"]);
});

test("a DigUp whose helper is missing says so, instead of asking for an update it doesn't need", async () => {
  assert.deepEqual(await checkReadiness([], system({ isExecutable: async () => false })), {
    state: "outdated",
    appPath: "/Applications/DigUp.app",
    version: "0.6.1",
    helperMissing: true,
  });
  // A version that can't be read is not called "0".
  const unreadable = await checkReadiness([], system({ version: async () => undefined }));
  assert.deepEqual(unreadable, { state: "outdated", appPath: "/Applications/DigUp.app", version: "unknown" });
});
