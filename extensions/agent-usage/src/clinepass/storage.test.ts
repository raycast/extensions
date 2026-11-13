import assert from "node:assert/strict";
import { register } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { ClinePassCredential } from "./types.ts";

const mockStorage = new Map<string, string>();
(globalThis as unknown as { mockStorage: Map<string, string> }).mockStorage = mockStorage;

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(currentDirectory, "..", "accounts", "storage-mock-loader.js")), {
  parentURL: import.meta.url,
});

async function loadStorageModule() {
  return import("./storage.ts");
}

test.beforeEach(() => {
  mockStorage.clear();
});

test("refreshed Cline credentials round-trip through Raycast LocalStorage", async () => {
  const { loadClineLocalCredential, saveClineLocalCredential } = await loadStorageModule();
  const credential: ClinePassCredential = {
    id: "clinepass-auto",
    label: "Local User",
    token: "workos:local-token",
    userId: "usr-local",
    refreshToken: "local-refresh",
    expiresAt: 2_000_000_000_000,
    source: "local",
    clineHome: "C:\\.cline-test",
  };

  await saveClineLocalCredential(credential);

  assert.deepEqual(await loadClineLocalCredential(), credential);
  assert.equal(mockStorage.size, 1);
});

test("clearing the refreshed Cline credential removes it from Raycast LocalStorage", async () => {
  const { clearClineLocalCredential, loadClineLocalCredential, saveClineLocalCredential } = await loadStorageModule();
  await saveClineLocalCredential({
    id: "clinepass-auto",
    label: "Local User",
    token: "workos:local-token",
    userId: "usr-local",
    source: "local",
  });

  await clearClineLocalCredential();

  assert.equal(await loadClineLocalCredential(), null);
  assert.equal(mockStorage.size, 0);
});

test("malformed locally stored Cline credentials are ignored", async () => {
  const { loadClineLocalCredential } = await loadStorageModule();
  mockStorage.set("clinepass-refreshed-credential-v1", JSON.stringify({ version: 1, token: "missing-fields" }));

  assert.equal(await loadClineLocalCredential(), null);
});
