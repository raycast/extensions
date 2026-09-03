import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FileProfileRepository } from "../src/adapters/macos/file-profile-repository";

function profile(name: string) {
  return {
    name,
    reverseVertical: false,
    reverseHorizontal: false,
    verticalMultiplier: 1,
    horizontalMultiplier: 1,
  };
}

test("creates and atomically reloads a profile document", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mouse-scroll-profile-"));
  try {
    const path = join(directory, "profiles.json");
    const repository = new FileProfileRepository(path);
    const document = {
      version: 1 as const,
      profiles: {
        key: {
          name: "Mouse",
          reverseVertical: false,
          reverseHorizontal: true,
          verticalMultiplier: 1.25,
          horizontalMultiplier: 2,
        },
      },
    };
    assert.equal((await repository.save(document)).status, "succeeded");
    assert.deepEqual(await repository.load(), { status: "succeeded", value: document });
    assert.match(await readFile(path, "utf8"), /"version": 1/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects malformed persisted profile fields instead of passing corrupt values to the UI", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mouse-scroll-profile-"));
  try {
    const path = join(directory, "profiles.json");
    const repository = new FileProfileRepository(path);
    await writeFile(
      path,
      JSON.stringify({
        version: 1,
        profiles: {
          stringMultiplier: {
            name: "Mouse",
            reverseVertical: false,
            reverseHorizontal: false,
            verticalMultiplier: "NaN",
            horizontalMultiplier: 1,
          },
        },
      }),
    );
    assert.equal((await repository.load()).status, "failed");
    await writeFile(
      path,
      JSON.stringify({
        version: 1,
        profiles: {
          missingDirection: { name: "Mouse", reverseVertical: false, verticalMultiplier: 11, horizontalMultiplier: 1 },
        },
      }),
    );
    assert.equal((await repository.load()).status, "failed");
    await writeFile(
      path,
      JSON.stringify({
        version: 1,
        profiles: {
          outOfRange: {
            name: "Mouse",
            reverseVertical: false,
            reverseHorizontal: false,
            verticalMultiplier: 10.1,
            horizontalMultiplier: 1,
          },
        },
      }),
    );
    assert.equal((await repository.load()).status, "failed");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("serializes concurrent upserts from separate repository instances without losing either profile", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mouse-scroll-profile-"));
  try {
    const path = join(directory, "profiles.json");
    const first = new FileProfileRepository(path);
    const second = new FileProfileRepository(path);
    const [firstResult, secondResult] = await Promise.all([
      first.upsert("mouse-a", profile("Mouse A")),
      second.upsert("mouse-b", profile("Mouse B")),
    ]);
    assert.equal(firstResult.status, "succeeded");
    assert.equal(secondResult.status, "succeeded");
    const final = await first.load();
    assert.equal(final.status, "succeeded");
    if (final.status === "succeeded") {
      assert.deepEqual(Object.keys(final.value.profiles).sort(), ["mouse-a", "mouse-b"]);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("times out behind a live lock and safely recovers a proven stale lock", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mouse-scroll-profile-"));
  try {
    const path = join(directory, "profiles.json");
    const lockPath = `${path}.lock`;
    await mkdir(lockPath);
    await writeFile(`${lockPath}/owner.json`, `${JSON.stringify({ pid: process.pid, createdAt: Date.now() })}\n`);
    const blocked = new FileProfileRepository(path, {
      retryMilliseconds: 1,
      staleMilliseconds: 60_000,
      timeoutMilliseconds: 20,
    });
    const timeout = await blocked.upsert("mouse-a", profile("Mouse A"));
    assert.deepEqual(timeout, { status: "failed", error: "Timed out acquiring profile lock." });
    await rm(lockPath, { recursive: true, force: true });

    await mkdir(lockPath);
    await writeFile(`${lockPath}/owner.json`, `${JSON.stringify({ pid: 999_999_999, createdAt: 0 })}\n`);
    const recovered = new FileProfileRepository(path, {
      retryMilliseconds: 1,
      staleMilliseconds: 0,
      timeoutMilliseconds: 100,
    });
    assert.equal((await recovered.upsert("mouse-a", profile("Mouse A"))).status, "succeeded");
    assert.deepEqual(await recovered.load(), {
      status: "succeeded",
      value: { version: 1, profiles: { "mouse-a": profile("Mouse A") } },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
