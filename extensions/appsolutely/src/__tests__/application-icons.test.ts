import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { PNG } from "pngjs";
import {
  applicationIcon,
  iconCandidates,
  isUsableApplicationIcon,
  loadApplicationIcons,
} from "../services/application-icons.ts";
import { folderPreview, renderFolderPreview } from "../services/folder-previews.ts";

const run = promisify(execFile);

function icns(png: Buffer): Buffer {
  const header = Buffer.alloc(16);
  header.write("icns", 0);
  header.writeUInt32BE(png.length + 16, 4);
  header.write("ic09", 8);
  header.writeUInt32BE(png.length + 8, 12);
  return Buffer.concat([header, png]);
}

test("icon validation rejects transparent stubs, malformed data, and undersized images", () => {
  const image = new PNG({ width: 512, height: 512 });
  assert.equal(isUsableApplicationIcon(PNG.sync.write(image)), false);
  image.data.set([255, 120, 0, 255], (256 * 512 + 256) * 4);
  const visible = PNG.sync.write(image);
  assert.equal(isUsableApplicationIcon(visible), true);
  assert.equal(isUsableApplicationIcon(visible.subarray(0, 24)), false);
  assert.equal(isUsableApplicationIcon(Buffer.from("not a PNG")), false);
  const small = new PNG({ width: 32, height: 32 });
  small.data.fill(255);
  assert.equal(isUsableApplicationIcon(PNG.sync.write(small)), false);
});

test("icon resolution uses declared bundle icons and rejects paths outside Resources", () => {
  assert.deepEqual(
    iconCandidates("/Example.app/Contents/Resources", {
      CFBundleIconFile: "Main Icon",
      CFBundleIconName: "Alternate.icns",
    }),
    ["/Example.app/Contents/Resources/Main Icon.icns", "/Example.app/Contents/Resources/Alternate.icns"],
  );
  assert.deepEqual(
    iconCandidates("/Example.app/Contents/Resources", {
      CFBundleIconFile: "../../outside.icns",
      CFBundleIconName: "/outside.icns",
    }),
    [],
  );
  assert.deepEqual(
    iconCandidates("/Example.app/Contents/Resources", {
      CFBundleIconFile: "Main.icns",
      CFBundleIconName: "Main.icns",
    }),
    ["/Example.app/Contents/Resources/Main.icns"],
  );
});

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "appsolutely-icons-"));
  const appPath = join(directory, "Test ; $() App.app");
  const resources = join(appPath, "Contents", "Resources");
  const cache = join(directory, "cache");
  await mkdir(resources, { recursive: true });
  await writeFile(
    join(appPath, "Contents", "Info.plist"),
    `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0"><dict><key>CFBundleIconFile</key><string>Grid Icon</string></dict></plist>`,
  );
  const png = await readFile(new URL("../../assets/extension-icon.png", import.meta.url));
  const source = join(resources, "Grid Icon.icns");
  await writeFile(source, icns(png));
  return { directory, appPath, cache, source };
}

test(
  "folder previews resolve their icons on demand and invalidate when the source changes",
  {
    skip: process.platform !== "darwin",
  },
  async () => {
    const { directory, appPath, cache, source } = await fixture();
    try {
      const entries = [{ appPath }];
      const previews = join(directory, "previews");
      const preview = await folderPreview(entries, previews, cache);
      assert.ok(preview);
      const icon = await applicationIcon(appPath, cache);
      assert.ok(icon);
      assert.deepEqual(await readFile(preview), renderFolderPreview([await readFile(icon)]));
      const timestamp = (await stat(preview)).mtimeMs;
      assert.equal(await folderPreview(entries, previews, cache), preview);
      assert.equal((await stat(preview)).mtimeMs, timestamp);
      const changed = new Date(Date.now() + 2000);
      await utimes(source, changed, changed);
      const updated = await folderPreview(entries, previews, cache);
      assert.ok(updated);
      assert.notEqual(updated, preview);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test(
  "native extraction preserves 512px resolution and alpha, reuses cache, and invalidates updated icons",
  {
    skip: process.platform !== "darwin",
  },
  async () => {
    const fixtureData = await fixture();
    const { directory, appPath, cache, source } = fixtureData;
    try {
      const image = await applicationIcon(appPath, cache);
      assert.ok(image);
      const png = await readFile(image);
      assert.equal(png.readUInt32BE(16), 512);
      assert.equal(png.readUInt32BE(20), 512);
      const { stdout } = await run("/usr/bin/sips", ["-g", "hasAlpha", image]);
      assert.match(stdout, /hasAlpha: yes/);
      const before = await stat(image);
      assert.equal(await applicationIcon(appPath, cache), image);
      assert.equal((await stat(image)).mtimeMs, before.mtimeMs);
      const record = (await readdir(cache)).find((file) => file.endsWith(".json"))!;
      await writeFile(join(cache, record), "corrupt cache metadata");
      assert.equal(await applicationIcon(appPath, cache), image);
      assert.equal(JSON.parse(await readFile(join(cache, record), "utf8")).version, 2);
      // Valid-looking but transparent cached icons must be regenerated too.
      await writeFile(image, PNG.sync.write(new PNG({ width: 512, height: 512 })));
      assert.equal(await applicationIcon(appPath, cache), image);
      assert.equal(isUsableApplicationIcon(await readFile(image)), true);
      const changed = new Date(Date.now() + 2000);
      await utimes(source, changed, changed);
      const updated = await applicationIcon(appPath, cache);
      assert.ok(updated);
      assert.notEqual(updated, image);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test(
  "missing and corrupt icons fail independently without breaking the remaining app catalog",
  {
    skip: process.platform !== "darwin",
  },
  async () => {
    const { directory, appPath, cache, source } = await fixture();
    try {
      const found = new Map<string, string>();
      const missing = join(directory, "Missing.app");
      const settled: string[] = [];
      await loadApplicationIcons([missing, appPath], cache, (path, image) => {
        settled.push(path);
        if (image) found.set(path, image);
      });
      assert.deepEqual(settled.sort(), [missing, appPath].sort());
      assert.equal(found.size, 1);
      assert.ok(found.has(appPath));
      const original = await readFile(source);
      await writeFile(source, "invalid icon");
      assert.equal(
        await applicationIcon(appPath, cache, async () => {
          throw new Error("resolver unavailable");
        }),
        undefined,
      );
      assert.equal(await applicationIcon(missing, cache), undefined);
      // A cache location that is a file must also fail without hiding the application.
      const blocked = join(directory, "blocked");
      await writeFile(blocked, "not a directory");
      await writeFile(source, original);
      assert.equal(await applicationIcon(appPath, blocked), undefined);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test(
  "transparent ICNS uses the native resolver, caches its visible icon, and tracks asset updates",
  {
    skip: process.platform !== "darwin",
  },
  async () => {
    const { directory, appPath, cache, source } = await fixture();
    try {
      const blank = PNG.sync.write(new PNG({ width: 512, height: 512 }));
      await writeFile(source, icns(blank));
      const assets = join(appPath, "Contents", "Resources", "Assets.car");
      await writeFile(assets, "asset catalog version 1");
      const visible = await readFile(new URL("../../assets/extension-icon.png", import.meta.url));
      let renders = 0;
      const renderer = async (path: string, output: string) => {
        assert.equal(path, appPath);
        renders++;
        await writeFile(output, visible);
      };
      const image = await applicationIcon(appPath, cache, renderer);
      assert.ok(image);
      assert.equal(isUsableApplicationIcon(await readFile(image)), true);
      assert.equal(renders, 1);
      assert.equal(await applicationIcon(appPath, cache, renderer), image);
      assert.equal(renders, 1);
      await writeFile(assets, "asset catalog version 2 changed");
      const updated = await applicationIcon(appPath, cache, renderer);
      assert.ok(updated);
      assert.notEqual(updated, image);
      assert.equal(renders, 2);
      // Even the system fallback is rejected if it returns transparent pixels.
      await writeFile(assets, "asset catalog version 3");
      assert.equal(
        await applicationIcon(appPath, cache, async (_path, output) => {
          await writeFile(output, blank);
        }),
        undefined,
      );
      assert.ok(!(await readdir(cache)).some((file) => file.endsWith(".tmp")));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
