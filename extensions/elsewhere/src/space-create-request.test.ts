import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SPACE_CREATE_REQUEST_DIRECTORY,
  SPACE_CREATE_REQUEST_MAX_PENDING,
  SPACE_CREATE_REQUEST_TTL_MS,
  writeSpaceCreateRequest,
} from "./space-create-request";

const REQUEST_ID = "raycast_123_abcdefghijkl";
const NONCE = "abcdefghijklmnopqrstuvwxyz012345";

test("writes a private, expiring creation envelope without putting the prompt in the URL contract", async () => {
  const appDataDirectory = await mkdtemp(path.join(tmpdir(), "elsewhere-request-test-"));
  const now = new Date("2026-08-10T10:00:00.000Z");
  const prepared = await writeSpaceCreateRequest(appDataDirectory, REQUEST_ID, NONCE, "  A rainy cabin  ", { now });

  assert.equal(prepared.requestId, REQUEST_ID);
  assert.equal(prepared.nonce, NONCE);
  assert.equal(path.basename(prepared.requestPath), `${REQUEST_ID}.json`);
  const envelope = JSON.parse(await readFile(prepared.requestPath, "utf8"));
  assert.deepEqual(envelope, {
    schemaVersion: 1,
    kind: "space.create",
    requestId: REQUEST_ID,
    nonce: NONCE,
    prompt: "A rainy cabin",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SPACE_CREATE_REQUEST_TTL_MS).toISOString(),
  });
  assert.equal((await stat(path.dirname(prepared.requestPath))).mode & 0o777, 0o700);
  assert.equal((await stat(prepared.requestPath)).mode & 0o777, 0o600);
});

test("prunes expired requests and enforces the pending-request bound", async () => {
  const appDataDirectory = await mkdtemp(path.join(tmpdir(), "elsewhere-request-test-"));
  const requestDirectory = path.join(appDataDirectory, SPACE_CREATE_REQUEST_DIRECTORY);
  await mkdir(requestDirectory, { mode: 0o700 });
  const now = new Date("2026-08-10T10:00:00.000Z");
  const base = {
    schemaVersion: 1,
    kind: "space.create",
    nonce: NONCE,
    prompt: "Rain",
    createdAt: new Date(now.getTime() - 1_000).toISOString(),
  };
  await writeFile(
    path.join(requestDirectory, "expired.json"),
    JSON.stringify({ ...base, requestId: "expired", expiresAt: new Date(now.getTime() - 1).toISOString() }),
    { mode: 0o600 },
  );
  for (let index = 0; index < SPACE_CREATE_REQUEST_MAX_PENDING; index += 1) {
    await writeFile(
      path.join(requestDirectory, `pending_${index}.json`),
      JSON.stringify({
        ...base,
        requestId: `pending_${index}`,
        expiresAt: new Date(now.getTime() + 30_000).toISOString(),
      }),
      { mode: 0o600 },
    );
  }

  await assert.rejects(
    writeSpaceCreateRequest(appDataDirectory, REQUEST_ID, NONCE, "Rain", { now }),
    /too many pending creation requests/,
  );
  await assert.rejects(readFile(path.join(requestDirectory, "expired.json"), "utf8"), /ENOENT/);
});

test("removes abandoned temporary envelopes after the request TTL", async () => {
  const appDataDirectory = await mkdtemp(path.join(tmpdir(), "elsewhere-request-test-"));
  const requestDirectory = path.join(appDataDirectory, SPACE_CREATE_REQUEST_DIRECTORY);
  await mkdir(requestDirectory, { mode: 0o700 });
  const temporaryPath = path.join(requestDirectory, ".abandoned.tmp");
  await writeFile(temporaryPath, "private prompt", { mode: 0o600 });
  const now = new Date(Date.now() + SPACE_CREATE_REQUEST_TTL_MS + 1);

  await writeSpaceCreateRequest(appDataDirectory, REQUEST_ID, NONCE, "Rain", { now });
  await assert.rejects(readFile(temporaryPath, "utf8"), /ENOENT/);
});

test("rejects symlinked request directories", async () => {
  const appDataDirectory = await mkdtemp(path.join(tmpdir(), "elsewhere-request-test-"));
  const target = await mkdtemp(path.join(tmpdir(), "elsewhere-request-target-"));
  await symlink(target, path.join(appDataDirectory, SPACE_CREATE_REQUEST_DIRECTORY));
  await assert.rejects(writeSpaceCreateRequest(appDataDirectory, REQUEST_ID, NONCE, "Rain"), /not a regular directory/);
});

test("rejects invalid identifiers and prompts before writing", async () => {
  const appDataDirectory = await mkdtemp(path.join(tmpdir(), "elsewhere-request-test-"));
  await assert.rejects(writeSpaceCreateRequest(appDataDirectory, "../escape", NONCE, "Rain"), /identifier/);
  await assert.rejects(writeSpaceCreateRequest(appDataDirectory, REQUEST_ID, "short", "Rain"), /nonce/);
  await assert.rejects(writeSpaceCreateRequest(appDataDirectory, REQUEST_ID, NONCE, " "), /must not be empty/);
});
