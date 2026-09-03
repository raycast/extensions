import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FileProfileRepository } from "../src/adapters/macos/file-profile-repository";

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
