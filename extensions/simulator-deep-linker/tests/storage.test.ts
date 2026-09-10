import assert from "node:assert/strict";
import { lstat, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  addDeepLink,
  decodeDeepLinks,
  resolveStorageConfigurationAt,
  type StorageConfiguration,
} from "../src/storage.js";

const validDeepLink = {
  id: "8DB1E10D-20DB-4A4B-95B8-845156B4873A",
  title: "Product Details",
  urlString: "demoapp://product/123",
  createdAt: "2026-08-11T09:00:00Z",
  updatedAt: "2026-08-11T09:00:00Z",
};

test("validates deep links and supplies the companion app defaults", () => {
  assert.deepEqual(decodeDeepLinks(JSON.stringify([validDeepLink])), [
    { ...validDeepLink, group: "", tags: [], isFavorite: false },
  ]);
  assert.throws(() => decodeDeepLinks(JSON.stringify([{ ...validDeepLink, urlString: 42 }])), /index 0/);
  assert.throws(
    () => decodeDeepLinks(JSON.stringify([{ ...validDeepLink, createdAt: "2026-02-31T09:00:00Z" }])),
    /index 0/,
  );
  assert.throws(() => decodeDeepLinks(JSON.stringify([validDeepLink, validDeepLink])), /duplicate/);
});

test("falls back to default storage only when the integration manifest is absent", async (t) => {
  const applicationSupport = await temporaryDirectory(t);
  const defaultStorage = path.join(applicationSupport, "deeplinks.json");
  await writeFile(defaultStorage, "[]\n");

  assert.deepEqual(await resolveStorageConfigurationAt(applicationSupport), {
    storagePath: defaultStorage,
    environmentsPath: path.join(applicationSupport, "environments.json"),
  });

  await writeFile(path.join(applicationSupport, "integration.json"), "not json\n");
  await assert.rejects(() => resolveStorageConfigurationAt(applicationSupport), /manifest contains invalid JSON/);
});

test("does not silently use default storage when the active storage is unavailable", async (t) => {
  const applicationSupport = await temporaryDirectory(t);
  await writeFile(path.join(applicationSupport, "deeplinks.json"), "[]\n");
  await writeFile(
    path.join(applicationSupport, "integration.json"),
    JSON.stringify({
      schemaVersion: 1,
      storagePath: path.join(applicationSupport, "missing.json"),
      environmentsPath: path.join(applicationSupport, "environments.json"),
    }),
  );

  await assert.rejects(() => resolveStorageConfigurationAt(applicationSupport), /missing\.json/);
});

test("atomic updates preserve a custom storage symlink", async (t) => {
  const directory = await temporaryDirectory(t);
  const targetPath = path.join(directory, "actual", "deeplinks.json");
  const symlinkPath = path.join(directory, "shared.json");
  await mkdir(path.dirname(targetPath));
  await writeFile(targetPath, `${JSON.stringify([validDeepLink])}\n`);
  await symlink(targetPath, symlinkPath);

  const configuration: StorageConfiguration = {
    storagePath: symlinkPath,
    environmentsPath: path.join(directory, "environments.json"),
  };
  await addDeepLink(configuration, {
    title: "Cart",
    urlString: "demoapp://cart",
    group: "Checkout",
    tags: ["smoke"],
    isFavorite: true,
  });

  assert.equal((await lstat(symlinkPath)).isSymbolicLink(), true);
  assert.equal(decodeDeepLinks(await readFile(targetPath, "utf8")).length, 2);
});

async function temporaryDirectory(t: test.TestContext): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "simulator-deep-linker-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
