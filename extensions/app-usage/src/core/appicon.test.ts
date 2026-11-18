import assert from "node:assert/strict";
import { existsSync, promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { appIconPng, clearIconCache } from "./appicon";

/** Ships with every Mac, so the test needs no fixture of its own. */
const CALCULATOR = "/System/Applications/Calculator.app";

let root = "";

before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "app-usage-icon-test-"));
});

after(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("clearIconCache", () => {
  it(
    "waits for a conversion already under way instead of being undone by it",
    { skip: !existsSync(CALCULATOR) },
    async () => {
      const cacheDir = path.join(root, "race-case");
      const converting = appIconPng(CALCULATOR, "com.apple.calculator", cacheDir);

      await clearIconCache(cacheDir);

      assert.ok(await converting, "the conversion itself still succeeds");
      assert.equal(existsSync(cacheDir), false, "but nothing is left behind after the clear");
    },
  );
});
