import assert from "node:assert/strict";
import { lstat, mkdtemp, mkdir, readFile, readdir, rm, symlink, unlink, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  addDeepLink,
  decodeDeepLinks,
  deleteDeepLink,
  resolveStorageConfigurationAt,
  withStorageLock,
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

test("concurrent additions preserve every mutation", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  await writeFile(storagePath, "[]\n");
  const configuration: StorageConfiguration = {
    storagePath,
    environmentsPath: path.join(directory, "environments.json"),
  };

  await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      addDeepLink(configuration, {
        title: `Concurrent ${index}`,
        urlString: `demoapp://concurrent/${index}`,
        group: "",
        tags: [],
        isFavorite: false,
      }),
    ),
  );

  const links = decodeDeepLinks(await readFile(storagePath, "utf8"));
  assert.equal(links.length, 20);
  assert.equal(new Set(links.map((link) => link.urlString)).size, 20);
});

test("concurrent add and delete preserve both mutations", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  await writeFile(storagePath, `${JSON.stringify([validDeepLink])}\n`);
  const configuration: StorageConfiguration = {
    storagePath,
    environmentsPath: path.join(directory, "environments.json"),
  };

  await Promise.all([
    addDeepLink(configuration, {
      title: "New link",
      urlString: "demoapp://new",
      group: "",
      tags: [],
      isFavorite: false,
    }),
    deleteDeepLink(configuration, validDeepLink.id),
  ]);

  const links = decodeDeepLinks(await readFile(storagePath, "utf8"));
  assert.deepEqual(
    links.map((link) => link.urlString),
    ["demoapp://new"],
  );
});

test("does not reclaim an existing lock solely because it is old", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  const lockPath = `${storagePath}.simulator-deep-linker.lock`;
  const ownerPath = path.join(lockPath, "owner");
  await writeFile(storagePath, "[]\n");
  await mkdir(lockPath);
  await writeFile(ownerPath, "replacement-writer\n");
  const oldDate = new Date(0);
  await utimes(lockPath, oldDate, oldDate);

  await assert.rejects(
    () => withStorageLock(storagePath, async () => undefined, { retryMilliseconds: 1, timeoutMilliseconds: 10 }),
    /Timed out waiting/,
  );

  assert.equal(await readFile(ownerPath, "utf8"), "replacement-writer\n");
});

test("recovers a lock whose recorded writer is no longer running", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  const lockPath = `${storagePath}.simulator-deep-linker.lock`;
  await writeFile(storagePath, "[]\n");
  await mkdir(lockPath);
  await writeFile(
    path.join(lockPath, "owner"),
    `${JSON.stringify({ schemaVersion: 1, token: "abandoned-writer", pid: 2_147_483_647 })}\n`,
  );

  await withStorageLock(storagePath, async () => undefined, { retryMilliseconds: 1, timeoutMilliseconds: 100 });

  await assert.rejects(() => lstat(lockPath), /ENOENT/);
});

test("recovers an abandoned published lock and removes its candidate directory", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  const lockPath = `${storagePath}.simulator-deep-linker.lock`;
  const candidatePath = `${lockPath}.candidate.abandoned-writer`;
  await writeFile(storagePath, "[]\n");
  await mkdir(candidatePath);
  await writeFile(
    path.join(candidatePath, "owner"),
    `${JSON.stringify({ schemaVersion: 1, token: "abandoned-writer", pid: 2_147_483_647 })}\n`,
  );
  await symlink(candidatePath, lockPath, "dir");

  await withStorageLock(storagePath, async () => undefined, { retryMilliseconds: 1, timeoutMilliseconds: 100 });

  await assert.rejects(() => lstat(lockPath), /ENOENT/);
  await assert.rejects(() => lstat(candidatePath), /ENOENT/);
});

test("takes over a recovery claim whose claimant is no longer running", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  const lockPath = `${storagePath}.simulator-deep-linker.lock`;
  const candidatePath = `${lockPath}.candidate.abandoned-writer`;
  const abandonedPID = 2_147_483_647;
  await writeFile(storagePath, "[]\n");
  await mkdir(candidatePath);
  await writeFile(
    path.join(candidatePath, "owner"),
    `${JSON.stringify({ schemaVersion: 1, token: "abandoned-writer", pid: abandonedPID })}\n`,
  );
  await writeFile(
    path.join(candidatePath, ".recovery-claim"),
    `${JSON.stringify({
      schemaVersion: 1,
      ownerToken: "abandoned-writer",
      ownerPid: abandonedPID,
      claimantToken: "crashed-recovery",
      claimantPid: abandonedPID,
    })}\n`,
  );
  await symlink(candidatePath, lockPath, "dir");

  await withStorageLock(storagePath, async () => undefined, { retryMilliseconds: 1, timeoutMilliseconds: 100 });

  await assert.rejects(() => lstat(lockPath), /ENOENT/);
  await assert.rejects(() => lstat(candidatePath), /ENOENT/);
});

test("recovers when a previous claimant crashed during claim takeover", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  const lockPath = `${storagePath}.simulator-deep-linker.lock`;
  const candidatePath = `${lockPath}.candidate.abandoned-writer`;
  const abandonedPID = 2_147_483_647;
  await writeFile(storagePath, "[]\n");
  await mkdir(candidatePath);
  await writeFile(
    path.join(candidatePath, "owner"),
    `${JSON.stringify({ schemaVersion: 1, token: "abandoned-writer", pid: abandonedPID })}\n`,
  );
  await writeFile(
    path.join(candidatePath, ".recovery-claim.takeover.crashed-recovery"),
    `${JSON.stringify({
      schemaVersion: 1,
      ownerToken: "abandoned-writer",
      ownerPid: abandonedPID,
      claimantToken: "older-recovery",
      claimantPid: abandonedPID,
    })}\n`,
  );
  await symlink(candidatePath, lockPath, "dir");

  await withStorageLock(storagePath, async () => undefined, { retryMilliseconds: 1, timeoutMilliseconds: 100 });

  await assert.rejects(() => lstat(lockPath), /ENOENT/);
  await assert.rejects(() => lstat(candidatePath), /ENOENT/);
});

test("does not take a recovery claim from a live claimant", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  const lockPath = `${storagePath}.simulator-deep-linker.lock`;
  const candidatePath = `${lockPath}.candidate.abandoned-writer`;
  const abandonedPID = 2_147_483_647;
  await writeFile(storagePath, "[]\n");
  await mkdir(candidatePath);
  await writeFile(
    path.join(candidatePath, "owner"),
    `${JSON.stringify({ schemaVersion: 1, token: "abandoned-writer", pid: abandonedPID })}\n`,
  );
  await writeFile(
    path.join(candidatePath, ".recovery-claim"),
    `${JSON.stringify({
      schemaVersion: 1,
      ownerToken: "abandoned-writer",
      ownerPid: abandonedPID,
      claimantToken: "live-recovery",
      claimantPid: process.pid,
    })}\n`,
  );
  await symlink(candidatePath, lockPath, "dir");

  await assert.rejects(
    () => withStorageLock(storagePath, async () => undefined, { retryMilliseconds: 1, timeoutMilliseconds: 10 }),
    /Timed out waiting/,
  );

  assert.equal((await lstat(lockPath)).isSymbolicLink(), true);
  assert.equal((await lstat(candidatePath)).isDirectory(), true);
});

test("competing recoveries serialize mutations without moving another claimant's live claim", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  const lockPath = `${storagePath}.simulator-deep-linker.lock`;
  const abandonedPID = 2_147_483_647;
  await writeFile(storagePath, "[]\n");
  await mkdir(lockPath);
  await writeFile(
    path.join(lockPath, "owner"),
    `${JSON.stringify({ schemaVersion: 1, token: "abandoned-writer", pid: abandonedPID })}\n`,
  );
  const configuration: StorageConfiguration = {
    storagePath,
    environmentsPath: path.join(directory, "environments.json"),
  };

  await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      addDeepLink(configuration, {
        title: `Recovered ${index}`,
        urlString: `demoapp://recovered/${index}`,
        group: "",
        tags: [],
        isFavorite: false,
      }),
    ),
  );

  const links = decodeDeepLinks(await readFile(storagePath, "utf8"));
  assert.equal(links.length, 12);
  assert.equal(new Set(links.map((link) => link.urlString)).size, 12);
  assert.deepEqual(
    (await readdir(directory)).filter((entry) => entry.includes(".simulator-deep-linker.lock")),
    [],
  );
});

test("an unsuccessful recovery removes its own claim from a directory lock", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  const lockPath = `${storagePath}.simulator-deep-linker.lock`;
  const choosingToken = "11111111-1111-4111-8111-111111111111";
  const abandonedPID = 2_147_483_647;
  const choosingPath = path.join(lockPath, `.recovery-claim.choosing.${choosingToken}`);
  await writeFile(storagePath, "[]\n");
  await mkdir(lockPath);
  await writeFile(
    path.join(lockPath, "owner"),
    `${JSON.stringify({ schemaVersion: 1, token: "abandoned-writer", pid: abandonedPID })}\n`,
  );
  await writeFile(
    choosingPath,
    `${JSON.stringify({
      schemaVersion: 1,
      ownerToken: "abandoned-writer",
      ownerPid: abandonedPID,
      claimantToken: choosingToken,
      claimantPid: process.pid,
    })}\n`,
  );

  await assert.rejects(
    () => withStorageLock(storagePath, async () => undefined, { retryMilliseconds: 1, timeoutMilliseconds: 10 }),
    /Timed out waiting/,
  );
  assert.deepEqual((await readdir(lockPath)).sort(), ["owner", `.recovery-claim.choosing.${choosingToken}`].sort());

  await unlink(choosingPath);
  await withStorageLock(storagePath, async () => undefined, { retryMilliseconds: 1, timeoutMilliseconds: 100 });
  await assert.rejects(() => lstat(lockPath), /ENOENT/);
});

test("does not move or replace another recovery contender's live claim", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  const lockPath = `${storagePath}.simulator-deep-linker.lock`;
  const claimantToken = "22222222-2222-4222-8222-222222222222";
  const abandonedPID = 2_147_483_647;
  const claimPath = path.join(lockPath, `.recovery-claim.claim.${claimantToken}`);
  const claim = {
    schemaVersion: 2,
    ownerToken: "abandoned-writer",
    ownerPid: abandonedPID,
    claimantToken,
    claimantPid: process.pid,
    ticket: 1,
  };
  await writeFile(storagePath, "[]\n");
  await mkdir(lockPath);
  await writeFile(
    path.join(lockPath, "owner"),
    `${JSON.stringify({ schemaVersion: 1, token: "abandoned-writer", pid: abandonedPID })}\n`,
  );
  await writeFile(claimPath, `${JSON.stringify(claim)}\n`);

  await assert.rejects(
    () => withStorageLock(storagePath, async () => undefined, { retryMilliseconds: 1, timeoutMilliseconds: 10 }),
    /Timed out waiting/,
  );

  assert.equal(await readFile(claimPath, "utf8"), `${JSON.stringify(claim)}\n`);
  assert.deepEqual((await readdir(lockPath)).sort(), ["owner", `.recovery-claim.claim.${claimantToken}`].sort());
});

test("recovers a legacy transition lock with records left by dead recovery claimants", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  const lockPath = `${storagePath}.simulator-deep-linker.lock`;
  const abandonedPID = 2_147_483_647;
  const transitionName = ".release.abandoned-writer";
  const choosingToken = "33333333-3333-4333-8333-333333333333";
  const claimToken = "44444444-4444-4444-8444-444444444444";
  await writeFile(storagePath, "[]\n");
  await mkdir(lockPath);
  await writeFile(
    path.join(lockPath, transitionName),
    `${JSON.stringify({ schemaVersion: 1, token: "abandoned-writer", pid: abandonedPID })}\n`,
  );
  await writeFile(
    path.join(lockPath, `.recovery-claim.choosing.${choosingToken}`),
    `${JSON.stringify({
      schemaVersion: 1,
      ownerToken: "abandoned-writer",
      ownerPid: abandonedPID,
      claimantToken: choosingToken,
      claimantPid: abandonedPID,
    })}\n`,
  );
  await writeFile(
    path.join(lockPath, `.recovery-claim.claim.${claimToken}`),
    `${JSON.stringify({
      schemaVersion: 2,
      ownerToken: "abandoned-writer",
      ownerPid: abandonedPID,
      claimantToken: claimToken,
      claimantPid: abandonedPID,
      ticket: 1,
    })}\n`,
  );

  await withStorageLock(storagePath, async () => undefined, { retryMilliseconds: 1, timeoutMilliseconds: 100 });

  await assert.rejects(() => lstat(lockPath), /ENOENT/);
  assert.deepEqual(
    (await readdir(directory)).filter((entry) => entry.includes(".simulator-deep-linker.lock")),
    [],
  );
});

test("does not reclaim an ownerless lock that could still belong to a writer", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  const lockPath = `${storagePath}.simulator-deep-linker.lock`;
  await writeFile(storagePath, "[]\n");
  await mkdir(lockPath);

  await assert.rejects(
    () => withStorageLock(storagePath, async () => undefined, { retryMilliseconds: 1, timeoutMilliseconds: 10 }),
    /unfinished storage update from an older version/,
  );

  assert.equal((await lstat(lockPath)).isDirectory(), true);
});

test("a waiting writer cannot replace the lock while its owner releases it", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  const lockPath = `${storagePath}.simulator-deep-linker.lock`;
  await writeFile(storagePath, "[]\n");

  let allowFirstWriterToFinish!: () => void;
  const firstWriterCanFinish = new Promise<void>((resolve) => {
    allowFirstWriterToFinish = resolve;
  });
  let firstWriterAcquired!: () => void;
  const firstWriterHasAcquired = new Promise<void>((resolve) => {
    firstWriterAcquired = resolve;
  });

  const firstWriter = withStorageLock(storagePath, async () => {
    firstWriterAcquired();
    await firstWriterCanFinish;
    return "first";
  });
  await firstWriterHasAcquired;
  assert.equal((await lstat(lockPath)).isSymbolicLink(), true);

  const secondWriter = withStorageLock(storagePath, async () => "second", {
    retryMilliseconds: 1,
    timeoutMilliseconds: 1_000,
  });
  allowFirstWriterToFinish();

  assert.deepEqual(await Promise.all([firstWriter, secondWriter]), ["first", "second"]);
  await assert.rejects(() => lstat(lockPath), /ENOENT/);
});

test("does not release a lock that was replaced by another writer", async (t) => {
  const directory = await temporaryDirectory(t);
  const storagePath = path.join(directory, "deeplinks.json");
  const lockPath = `${storagePath}.simulator-deep-linker.lock`;
  const ownerPath = path.join(lockPath, "owner");
  await writeFile(storagePath, "[]\n");

  await assert.rejects(
    () =>
      withStorageLock(storagePath, async () => {
        await rm(lockPath, { recursive: true });
        await mkdir(lockPath);
        await writeFile(ownerPath, "replacement-writer\n");
      }),
    /ownership changed/,
  );

  assert.equal(await readFile(ownerPath, "utf8"), "replacement-writer\n");
});

async function temporaryDirectory(t: test.TestContext): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "simulator-deep-linker-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
