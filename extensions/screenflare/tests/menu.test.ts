import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import { readMenuTitles, explainMenuError, menuScript } from "../src/lib/menu.ts";
import { actions } from "../src/lib/actions.ts";

test("localized menus tolerate an unreadable locale and preserve exact Unicode titles", async () => {
  const bundle = await mkdtemp(path.join(os.tmpdir(), "screenflare-menu-"));
  try {
    for (const [locale, value] of Object.entries({
      en: { pause: "Pause Recording", resume: "Resume Recording" },
      "zh-Hans": { pause: "暂停录制", resume: "继续录制" },
      fr: { pause: "Pause Recording" },
      broken: null,
    })) {
      const folder = path.join(bundle, "Contents", "Resources", `${locale}.lproj`);
      await mkdir(folder, { recursive: true });
      await writeFile(path.join(folder, "Localizable.strings"), value ? JSON.stringify(value) : "invalid");
    }
    const titles = await readMenuTitles(bundle, ["pause", "resume", "missing"]);
    assert.deepEqual(new Set(titles), new Set(["Pause Recording", "Resume Recording", "暂停录制", "继续录制"]));
    assert.equal(titles.length, 4);
    await assert.rejects(readMenuTitles(bundle, ["missing"]), /resources could not be read/);
  } finally {
    await rm(bundle, { recursive: true, force: true });
  }
});

test("permission, unavailable state, and incompatible menus produce different recovery instructions", () => {
  assert.equal(explainMenuError(new Error("osascript: -1743")).permission, true);
  assert.equal(explainMenuError(new Error("SF_ACCESSIBILITY")).permission, true);
  assert.match(explainMenuError(new Error("SF_DISABLED")).message, /start a recording first/);
  assert.match(explainMenuError(new Error("SF_MENU_MISSING")).message, /setup/);
  assert.equal(explainMenuError(new Error("disk unavailable")).message, "disk unavailable");
});

test("every declared action has a launchable command and an installed menu translation", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const commandNames = new Set(manifest.commands.map((command: { name: string }) => command.name));
  for (const action of actions) {
    assert.ok(commandNames.has(action.id), `${action.id} missing from manifest`);
    await readFile(new URL(`../src/${action.id}.ts`, import.meta.url));
    if (process.env.SCREENFLARE_TEST_APP) {
      assert.ok((await readMenuTitles(process.env.SCREENFLARE_TEST_APP, [action.key])).length > 0);
      if ("alternateKey" in action) {
        assert.ok((await readMenuTitles(process.env.SCREENFLARE_TEST_APP, [action.alternateKey])).length > 0);
      }
    }
  }
});

test("the native menu bridge compiles as AppleScript", async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), "screenflare-script-"));
  try {
    const source = path.join(folder, "menu.applescript");
    await writeFile(source, menuScript);
    await promisify(execFile)("/usr/bin/osacompile", ["-o", path.join(folder, "menu.scpt"), source]);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
