import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  getChromiumFaviconSignature,
  getChromiumSourceSignature,
} from "../src/utils/chromiumSourceSignature.ts";

test("tracks bookmark sources separately from the favicon database", async () => {
  const browserDataPath = await mkdtemp(join(tmpdir(), "browser-bookmarks-"));
  const profile = "Default";
  const profilePath = join(browserDataPath, profile);

  try {
    await mkdir(profilePath);
    await writeFile(join(browserDataPath, "Local State"), "state");
    await writeFile(join(profilePath, "Bookmarks"), "bookmarks");
    await writeFile(join(profilePath, "Favicons"), "favicon-a");

    const bookmarkSignature = await getChromiumSourceSignature(browserDataPath, profile);
    const faviconSignature = await getChromiumFaviconSignature(browserDataPath, profile);

    await writeFile(join(profilePath, "Favicons"), "favicon-updated");

    assert.equal(await getChromiumSourceSignature(browserDataPath, profile), bookmarkSignature);
    assert.notEqual(await getChromiumFaviconSignature(browserDataPath, profile), faviconSignature);
  } finally {
    await rm(browserDataPath, { recursive: true, force: true });
  }
});
