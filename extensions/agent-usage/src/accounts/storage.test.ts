// src/accounts/storage.test.ts
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock LocalStorage state
const mockStorage = new Map<string, string>();

// Make mockStorage available globally for the loader
(globalThis as unknown as { mockStorage: Map<string, string> }).mockStorage = mockStorage;

// Register module hook BEFORE importing anything else
// Use absolute path to the loader
const loaderPath = join(__dirname, "storage-mock-loader.mjs");
register(pathToFileURL(loaderPath), {
  parentURL: import.meta.url,
});

// Now import test framework
import test from "node:test";
import assert from "node:assert/strict";
import type { AccountEntry } from "./types";

// Replace the import before loading the module
const originalConsoleError = console.error;
let consoleErrorCalls: unknown[][] = [];

test.beforeEach(() => {
  mockStorage.clear();
  consoleErrorCalls = [];
  console.error = (...args: unknown[]) => {
    consoleErrorCalls.push(args);
  };
});

test.afterEach(() => {
  console.error = originalConsoleError;
});

async function loadStorageModule() {
  // Dynamically import after setting up mocks
  const module = await import("./storage");
  return module;
}

// Mock @raycast/api
test("loadAccounts returns empty array when no data exists", async () => {
  const { loadAccounts } = await loadStorageModule();
  const accounts = await loadAccounts("kimi");
  assert.deepEqual(accounts, []);
});

test("load/save roundtrip preserves accounts", async () => {
  const { loadAccounts, saveAccounts } = await loadStorageModule();
  const testAccounts: AccountEntry[] = [
    { id: "test-1", label: "Work", token: "token123" },
    { id: "test-2", label: "Personal", token: "token456" },
  ];

  await saveAccounts("kimi", testAccounts);
  const loaded = await loadAccounts("kimi");

  assert.deepEqual(loaded, testAccounts);
});

test("loadAccounts filters malformed entries", async () => {
  const { loadAccounts, saveAccounts } = await loadStorageModule();
  const malformedData = [
    { id: "valid-1", label: "Valid", token: "token123" },
    { id: "missing-label", token: "token456" },
    { id: "missing-token", label: "No Token" },
    { id: "empty-token", label: "Empty Token", token: "" },
    { id: "whitespace-token", label: "Whitespace Token", token: "   " },
    null,
    "not an object",
    { label: "No ID", token: "token789" },
  ];

  await saveAccounts("kimi", malformedData as unknown[] as AccountEntry[]);
  const loaded = await loadAccounts("kimi");

  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, "valid-1");
  assert.equal(loaded[0].label, "Valid");
  assert.equal(loaded[0].token, "token123");
});

test("loadAccounts logs error on corrupted JSON", async () => {
  const { loadAccounts } = await loadStorageModule();

  mockStorage.set("kimi-accounts", "not valid json");
  const accounts = await loadAccounts("kimi");

  assert.deepEqual(accounts, []);
  assert.equal(consoleErrorCalls.length, 1);
  assert.ok(String(consoleErrorCalls[0][0]).includes("Failed to parse accounts"));
});

test("addAccount creates account with UUID", async () => {
  const { addAccount, loadAccounts } = await loadStorageModule();

  const entry = await addAccount("kimi", "Test Account", "test-token");

  assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.id));
  assert.equal(entry.label, "Test Account");
  assert.equal(entry.token, "test-token");

  const accounts = await loadAccounts("kimi");
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].label, "Test Account");
});

test("addAccount trims whitespace from label and token", async () => {
  const { addAccount, loadAccounts } = await loadStorageModule();

  await addAccount("kimi", "  Test Account  ", "  test-token  ");

  const accounts = await loadAccounts("kimi");
  assert.equal(accounts[0].label, "Test Account");
  assert.equal(accounts[0].token, "test-token");
});

test("addAccount uses separate storage per provider", async () => {
  const { addAccount, loadAccounts } = await loadStorageModule();

  await addAccount("kimi", "Kimi Account", "kimi-token");
  await addAccount("zai", "Zai Account", "zai-token");

  const kimiAccounts = await loadAccounts("kimi");
  const zaiAccounts = await loadAccounts("zai");

  assert.equal(kimiAccounts.length, 1);
  assert.equal(kimiAccounts[0].label, "Kimi Account");
  assert.equal(zaiAccounts.length, 1);
  assert.equal(zaiAccounts[0].label, "Zai Account");
});

test("updateAccount returns true and modifies existing account", async () => {
  const { addAccount, updateAccount, loadAccounts } = await loadStorageModule();

  const entry = await addAccount("kimi", "Original", "token123");
  const result = await updateAccount("kimi", entry.id, { label: "Updated" });

  assert.equal(result, true);

  const accounts = await loadAccounts("kimi");
  assert.equal(accounts[0].label, "Updated");
  assert.equal(accounts[0].token, "token123");
});

test("updateAccount returns false for non-existent ID", async () => {
  const { addAccount, updateAccount, loadAccounts } = await loadStorageModule();

  await addAccount("kimi", "Original", "token123");
  const result = await updateAccount("kimi", "non-existent-id", { label: "Updated" });

  assert.equal(result, false);

  const accounts = await loadAccounts("kimi");
  assert.equal(accounts[0].label, "Original");
});

test("updateAccount updates token only", async () => {
  const { addAccount, updateAccount, loadAccounts } = await loadStorageModule();

  const entry = await addAccount("kimi", "Test", "old-token");
  await updateAccount("kimi", entry.id, { token: "new-token" });

  const accounts = await loadAccounts("kimi");
  assert.equal(accounts[0].label, "Test");
  assert.equal(accounts[0].token, "new-token");
});

test("deleteAccount returns true and removes existing account", async () => {
  const { addAccount, deleteAccount, loadAccounts } = await loadStorageModule();

  const entry = await addAccount("kimi", "Test", "token123");
  const result = await deleteAccount("kimi", entry.id);

  assert.equal(result, true);

  const accounts = await loadAccounts("kimi");
  assert.equal(accounts.length, 0);
});

test("deleteAccount returns false for non-existent ID", async () => {
  const { addAccount, deleteAccount, loadAccounts } = await loadStorageModule();

  await addAccount("kimi", "Test", "token123");
  const result = await deleteAccount("kimi", "non-existent-id");

  assert.equal(result, false);

  const accounts = await loadAccounts("kimi");
  assert.equal(accounts.length, 1);
});

test("deleteAccount only removes matching account", async () => {
  const { addAccount, deleteAccount, loadAccounts } = await loadStorageModule();

  const entry1 = await addAccount("kimi", "Account 1", "token1");
  await addAccount("kimi", "Account 2", "token2");

  await deleteAccount("kimi", entry1.id);

  const accounts = await loadAccounts("kimi");
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].label, "Account 2");
});

test("CRUD operations work correctly with multiple providers", async () => {
  const { addAccount, updateAccount, deleteAccount, loadAccounts } = await loadStorageModule();

  const kimiEntry = await addAccount("kimi", "Kimi", "kimi-token");
  await addAccount("zai", "Zai", "zai-token");

  await updateAccount("kimi", kimiEntry.id, { label: "Updated Kimi" });

  let kimiAccounts = await loadAccounts("kimi");
  let zaiAccounts = await loadAccounts("zai");

  assert.equal(kimiAccounts[0].label, "Updated Kimi");
  assert.equal(zaiAccounts[0].label, "Zai");

  await deleteAccount("kimi", kimiEntry.id);

  kimiAccounts = await loadAccounts("kimi");
  zaiAccounts = await loadAccounts("zai");

  assert.equal(kimiAccounts.length, 0);
  assert.equal(zaiAccounts.length, 1);
});
