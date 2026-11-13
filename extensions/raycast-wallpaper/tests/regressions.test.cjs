const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

// Run the production TypeScript with only Raycast and external side effects replaced.
function loadSource(filename, mocks = {}, platform = process.platform) {
  const filepath = path.resolve(__dirname, "..", filename);
  const source = ts.transpileModule(fs.readFileSync(filepath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const load = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith("."))
      return loadSource(
        path.relative(path.join(__dirname, ".."), path.resolve(path.dirname(filepath), `${id}.ts`)),
        mocks,
        platform,
      );
    return require(id);
  };
  new Function("require", "module", "exports", "process", source)(load, module, module.exports, { platform });
  return module.exports;
}

const wallpaper = { title: "Glaze 1", url: "https://example.com/wallpapers/glaze_1.heic" };

test("Windows converts HEIC bytes and filename while macOS keeps the original", async () => {
  let calls = 0;
  const files = loadSource("src/utils/wallpaper-file.ts", {
    "heic-convert": async ({ buffer, format }) => {
      calls++;
      assert.equal(buffer.toString(), "heic");
      assert.equal(format, "PNG");
      return Buffer.from("png");
    },
  });
  assert.equal(files.getPictureFilename(wallpaper, "win32"), "Glaze 1.png");
  assert.equal(files.getPictureFilename(wallpaper, "darwin"), "Glaze 1.heic");
  assert.equal((await files.preparePicture(Buffer.from("heic"), wallpaper.url, "win32")).toString(), "png");
  assert.equal((await files.preparePicture(Buffer.from("heic"), wallpaper.url, "darwin")).toString(), "heic");
  assert.equal(calls, 1);
  assert.equal(files.needsConversion("https://example.com/a.HEIF?download=1", "win32"), true);
  const png = Buffer.from("png");
  assert.equal(await files.preparePicture(png, "https://example.com/a.png", "win32"), png);
});

test("missing and tilde directories resolve to actual paths", () => {
  const files = loadSource("src/utils/wallpaper-file.ts");
  for (const directory of [undefined, "", " "]) {
    assert.equal(files.resolvePicturesDirectory(directory), path.join(os.homedir(), "Downloads"));
  }
  assert.equal(files.resolvePicturesDirectory("~/Pictures"), path.join(os.homedir(), "Pictures"));
  assert.equal(files.resolvePicturesDirectory("~\\Pictures"), path.join(os.homedir(), "Pictures"));
  assert.equal(files.resolvePicturesDirectory("/custom/folder"), "/custom/folder");
});

async function commonFixture(t, get, options = {}) {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), "wallpaper-test-"));
  t.after(() => fsp.rm(directory, { recursive: true, force: true }));
  const toasts = [];
  const failures = [];
  const opened = [];
  const common = loadSource("src/utils/common-utils.ts", {
    "@raycast/api": {
      Cache: class {},
      environment: { supportPath: directory },
      Toast: { Style: { Animated: "animated", Success: "success" } },
      showToast: async () => {
        const toast = {};
        toasts.push(toast);
        return toast;
      },
      open: async (value) => opened.push(value),
    },
    "@raycast/utils": { showFailureToast: async (error) => failures.push(error) },
    "../types/preferences": {
      picturesDirectory: options.noDirectory ? undefined : path.join(directory, "new-downloads"),
    },
    axios: { get },
    "node:os": { homedir: () => directory },
  });
  return { common, directory, toasts, failures, opened };
}

const pngWallpaper = { title: "Test", url: "https://example.com/test.png" };

test("simultaneous wallpaper requests share one completed download", async (t) => {
  let requests = 0;
  const { common } = await commonFixture(t, async () => {
    requests++;
    await new Promise((resolve) => setImmediate(resolve));
    return { data: Buffer.from("complete image") };
  });
  const [first, second] = await Promise.all([common.cachePicture(pngWallpaper), common.cachePicture(pngWallpaper)]);
  assert.equal(first, second);
  assert.equal(await fsp.readFile(first, "utf8"), "complete image");
  assert.equal(requests, 1);
  await common.cachePicture(pngWallpaper);
  assert.equal(requests, 1);
});

test("failed downloads leave no cached image and can be retried", async (t) => {
  let requests = 0;
  const { common } = await commonFixture(t, async () => {
    if (++requests === 1) throw new Error("Offline");
    return { data: Buffer.from("complete image") };
  });
  await assert.rejects(common.cachePicture(pngWallpaper), /Offline/);
  assert.equal(fs.existsSync(common.buildCachePath(pngWallpaper)), false);
  await common.cachePicture(pngWallpaper);
  assert.equal(requests, 2);
});

test("empty responses are rejected and empty cache files are repaired", async (t) => {
  let requests = 0;
  const { common } = await commonFixture(t, async () => ({ data: Buffer.from(++requests === 1 ? "" : "image") }));
  await assert.rejects(common.cachePicture(pngWallpaper), /empty/);
  await fsp.mkdir(common.cachePath, { recursive: true });
  await fsp.writeFile(common.buildCachePath(pngWallpaper), "");
  await common.cachePicture(pngWallpaper);
  assert.equal(await fsp.readFile(common.buildCachePath(pngWallpaper), "utf8"), "image");
});

test("downloads create the configured directory and finish before reporting success", async (t) => {
  const { common, directory, toasts } = await commonFixture(t, async () => ({ data: Buffer.from("image") }));
  await common.downloadPicture(pngWallpaper);
  assert.equal(await fsp.readFile(path.join(directory, "new-downloads", "Test.png"), "utf8"), "image");
  assert.equal(toasts[0].style, "success");
  await common.openWallpaperFolder();
});

test("download failures are reported without a success toast", async (t) => {
  const { common, failures, toasts } = await commonFixture(t, async () => {
    throw new Error("Offline");
  });
  await common.downloadPicture(pngWallpaper);
  assert.equal(failures[0].message, "Offline");
  assert.notEqual(toasts[0].style, "success");
});

test("clearing pictures preserves unrelated support files", async (t) => {
  const { common, directory } = await commonFixture(t, async () => ({ data: Buffer.from("image") }));
  await fsp.writeFile(path.join(directory, "settings.json"), "{}");
  await common.cachePicture(pngWallpaper);
  await common.deleteCache();
  assert.equal(fs.existsSync(common.cachePath), false);
  assert.equal(fs.existsSync(path.join(directory, "settings.json")), true);
});

test("appearance matches current catalog titles and overrides for new wallpapers", () => {
  let custom;
  const appearances = loadSource("src/utils/appearance-utils.ts", {
    "./common-utils": { cache: { get: () => custom } },
  });
  assert.equal(appearances.getAppearanceByTitle("Red Distortion 1"), "dark");
  assert.equal(appearances.getAppearanceByTitle("Cube"), "dark");
  custom = JSON.stringify([{ title: "Glaze 1", appearance: "dark" }]);
  assert.equal(appearances.getAppearanceByTitle("Glaze 1"), "dark");
});

test("Windows PowerShell dark mode output is case and whitespace insensitive", async () => {
  const platform = loadSource(
    "src/utils/platform-utils.ts",
    {
      "@raycast/api": {},
      "@raycast/utils": { runPowerShellScript: async () => "True\r\n" },
      "./common-utils": {},
      "../types/preferences": {},
      "rust:../../rust": {},
    },
    "win32",
  );
  assert.equal(await platform.getSystemAppearance(), "dark");
});

test("auto switch propagates native failures", async () => {
  const platform = loadSource(
    "src/utils/platform-utils.ts",
    {
      "@raycast/api": {},
      "@raycast/utils": {},
      "./common-utils": { cachePicture: async () => "C:/wallpaper.jpg" },
      "../types/preferences": { applyTo: "every" },
      "rust:../../rust": {
        set_wallpaper: async (file, mode) => {
          assert.equal(file, "C:\\wallpaper.jpg");
          assert.equal(mode, "every");
          throw new Error("Native failure");
        },
      },
    },
    "win32",
  );
  await assert.rejects(platform.autoSetWallpaper(wallpaper), /Native failure/);
});

test("AI wallpaper setting awaits the converted file and honors its monitor override", async () => {
  let downloaded = false;
  const platform = loadSource(
    "src/utils/platform-utils.ts",
    {
      "@raycast/api": {},
      "@raycast/utils": {},
      "./common-utils": {
        cachePicture: async () => {
          await new Promise((resolve) => setImmediate(resolve));
          downloaded = true;
          return "C:/converted.jpg";
        },
      },
      "../types/preferences": { applyTo: "every" },
      "rust:../../rust": {
        set_wallpaper: async (file, mode) => {
          assert.equal(downloaded, true);
          assert.equal(file, "C:\\converted.jpg");
          assert.equal(mode, "current");
          return "ok";
        },
      },
    },
    "win32",
  );
  await platform.applyWallpaper(wallpaper, "current");
  await assert.rejects(platform.applyWallpaper(wallpaper, "invalid"), /Invalid monitor/);
});

test("AI wallpaper setting propagates download and native failures", async () => {
  let downloadFails = true;
  const platform = loadSource(
    "src/utils/platform-utils.ts",
    {
      "@raycast/api": {},
      "@raycast/utils": {},
      "./common-utils": {
        cachePicture: async () => {
          if (downloadFails) throw new Error("Download failed");
          return "C:/converted.jpg";
        },
      },
      "../types/preferences": {},
      "rust:../../rust": {
        set_wallpaper: async () => {
          throw new Error("Monitor unavailable");
        },
      },
    },
    "win32",
  );
  await assert.rejects(platform.applyWallpaper(wallpaper, "current"), /Download failed/);
  downloadFails = false;
  await assert.rejects(platform.applyWallpaper(wallpaper, "current"), /Monitor unavailable/);
});

test("auto switch records refresh time only after a successful wallpaper change", async (t) => {
  t.mock.method(console, "error", () => {});
  const store = new Map([["Raycast_Wallpapers_List_Cache", JSON.stringify([pngWallpaper])]]);
  let fail = true;
  const errors = [];
  const auto = loadSource("src/auto-switch-raycast-wallpaper.ts", {
    "./utils/common-utils": { cache: { get: (key) => store.get(key), set: (key, value) => store.set(key, value) } },
    "@raycast/api": {
      environment: { launchType: "background" },
      LaunchType: { Background: "background", UserInitiated: "user" },
      captureException: (error) => errors.push(error),
    },
    "@raycast/utils": {},
    "./utils/platform-utils": {
      autoSetWallpaper: async () => {
        if (fail) throw new Error("Native failure");
      },
    },
    "./types/preferences": { respectAppearance: false, refreshIntervalSeconds: "3600" },
    "./utils/appearance-utils": { getAppearanceByTitle: () => "light" },
  });
  await auto.getRandomWallpaper();
  assert.equal(errors.length, 1);
  assert.equal(store.has("Last_Refresh_Time"), false);
  fail = false;
  await auto.getRandomWallpaper();
  assert.equal(store.has("Last_Refresh_Time"), true);
});

test("opening the wallpaper folder with an unset preference uses Downloads", async (t) => {
  const { common, directory, opened } = await commonFixture(
    t,
    async () => {
      throw new Error("Unexpected download");
    },
    { noDirectory: true },
  );
  await common.openWallpaperFolder();
  assert.deepEqual(opened, [path.join(directory, "Downloads")]);
  assert.equal(fs.statSync(opened[0]).isDirectory(), true);
});
