import assert from "node:assert/strict";
import test from "node:test";
import { createHistoryRepository, type HistoryStorage } from "../src/history-repository";
import type { HistoryEntry } from "../src/types";

class MemoryStorage implements HistoryStorage {
  readonly items = new Map<string, string | number | boolean>();

  async allItems(): Promise<Record<string, string | number | boolean>> {
    return Object.fromEntries(this.items);
  }

  async getItem<T extends string | number | boolean>(key: string): Promise<T | undefined> {
    return this.items.get(key) as T | undefined;
  }

  async setItem(key: string, value: string | number | boolean): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1));
    this.items.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.items.delete(key);
  }
}

function historyEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: "entry",
    sourceText: "草稿",
    normalizedSourceText: "草稿",
    mode: "natural",
    status: "pending",
    attempts: 1,
    createdAt: 1_000,
    updatedAt: 1_000,
    lastAttemptAt: 1_000,
    ...overrides,
  };
}

test("overlapping attempts from separate command instances preserve both drafts", async () => {
  const storage = new MemoryStorage();
  const firstCommand = createHistoryRepository(storage, {
    now: () => 1_000,
    createId: () => "first",
  });
  const secondCommand = createHistoryRepository(storage, {
    now: () => 1_001,
    createId: () => "second",
  });

  await Promise.all([
    firstCommand.beginAttempt("第一个草稿", "natural"),
    secondCommand.beginAttempt("第二个草稿", "punchy"),
  ]);

  const entries = await firstCommand.getHistory();

  assert.deepEqual(entries.map((entry) => entry.id).sort(), ["first", "second"]);
});

test("malformed legacy history is discarded without breaking recovery", async () => {
  const storage = new MemoryStorage();
  storage.items.set("tweetcraft.history.v1", "not valid JSON");
  const repository = createHistoryRepository(storage, {
    now: () => 1_000,
    createId: () => "unused",
  });

  await assert.doesNotReject(repository.getHistory());
  assert.deepEqual(await repository.getHistory(), []);
  assert.equal(storage.items.has("tweetcraft.history.v1"), false);
});

test("legacy array history migrates to per-entry storage", async () => {
  const storage = new MemoryStorage();
  const legacyEntry = historyEntry({ id: "legacy" });
  storage.items.set("tweetcraft.history.v1", JSON.stringify([legacyEntry]));
  const repository = createHistoryRepository(storage, {
    now: () => 1_000,
    createId: () => "unused",
  });

  assert.deepEqual(await repository.getHistory(), [legacyEntry]);
  assert.equal(storage.items.has("tweetcraft.history.v1"), false);
  assert.equal(storage.items.has("tweetcraft.history.v2.entry.legacy"), true);
});

test("legacy history remains intact when migration storage fails", async () => {
  class FailingMigrationStorage extends MemoryStorage {
    override async setItem(key: string, value: string | number | boolean): Promise<void> {
      if (key.startsWith("tweetcraft.history.v2.entry.")) throw new Error("Storage unavailable");
      await super.setItem(key, value);
    }
  }

  const storage = new FailingMigrationStorage();
  storage.items.set("tweetcraft.history.v1", JSON.stringify([historyEntry({ id: "legacy" })]));
  const repository = createHistoryRepository(storage, {
    now: () => 1_000,
    createId: () => "unused",
  });

  await assert.rejects(repository.getHistory(), /Storage unavailable/);
  assert.equal(storage.items.has("tweetcraft.history.v1"), true);
});

test("history retains at most 50 entries and removes records older than 30 days", async () => {
  const storage = new MemoryStorage();
  const now = 40 * 24 * 60 * 60 * 1_000;
  const repository = createHistoryRepository(storage, {
    now: () => now,
    createId: () => "unused",
  });

  storage.items.set(
    "tweetcraft.history.v2.entry.expired",
    JSON.stringify(historyEntry({ id: "expired", updatedAt: now - 31 * 24 * 60 * 60 * 1_000 })),
  );
  for (let index = 0; index < 51; index += 1) {
    const id = `recent-${index.toString().padStart(2, "0")}`;
    storage.items.set(
      `tweetcraft.history.v2.entry.${id}`,
      JSON.stringify(
        historyEntry({
          id,
          sourceText: `草稿 ${index}`,
          normalizedSourceText: `草稿 ${index}`,
          createdAt: now - index,
          updatedAt: now - index,
          lastAttemptAt: now - index,
        }),
      ),
    );
  }

  const entries = await repository.getHistory();

  assert.equal(entries.length, 50);
  assert.equal(
    entries.some((entry) => entry.id === "expired"),
    false,
  );
  assert.equal(storage.items.has("tweetcraft.history.v2.entry.expired"), false);
  assert.equal(storage.items.has("tweetcraft.history.v2.entry.recent-50"), false);
});

test("a matching draft within five minutes is updated instead of duplicated", async () => {
  const storage = new MemoryStorage();
  let now = 1_000;
  let nextId = 0;
  const repository = createHistoryRepository(storage, {
    now: () => now,
    createId: () => `entry-${nextId++}`,
  });

  const first = await repository.beginAttempt("  同一个   草稿  ", "short");
  now += 5 * 60 * 1_000;
  const duplicate = await repository.beginAttempt("同一个 草稿", "short");

  assert.equal(duplicate.id, first.id);
  assert.equal(duplicate.attempts, 2);
  assert.equal((await repository.getHistory()).length, 1);

  now += 5 * 60 * 1_000 + 1;
  const later = await repository.beginAttempt("同一个 草稿", "short");
  assert.notEqual(later.id, first.id);
  assert.equal((await repository.getHistory()).length, 2);
});

test("a successful retry updates the original failed record", async () => {
  const storage = new MemoryStorage();
  let now = 1_000;
  const repository = createHistoryRepository(storage, {
    now: () => now,
    createId: () => "retry-me",
  });

  const attempt = await repository.beginAttempt("稍后重试", "reply");
  now += 1;
  await repository.markError(attempt.id, "network", "Connection failed");
  now += 1;
  const retry = await repository.beginRetry(attempt);
  now += 1;
  const success = await repository.markSuccess(retry.id, "Try again later.");

  assert.equal(success?.id, attempt.id);
  assert.equal(success?.status, "success");
  assert.equal(success?.attempts, 2);
  assert.equal(success?.outputText, "Try again later.");
  assert.equal(success?.errorCategory, undefined);
  assert.equal((await repository.getHistory()).length, 1);
});

test("a failed retry keeps the previous successful English result recoverable", async () => {
  const storage = new MemoryStorage();
  let now = 1_000;
  const repository = createHistoryRepository(storage, {
    now: () => now,
    createId: () => "keep-result",
  });

  const attempt = await repository.beginAttempt("保留结果", "natural");
  now += 1;
  await repository.markSuccess(attempt.id, "Keep the result.");
  now += 1;
  const retry = await repository.beginRetry(attempt);
  now += 1;
  await repository.markError(retry.id, "timeout", "The Gemini request timed out");

  const [failedRetry] = await repository.getHistory();
  assert.equal(failedRetry.status, "error");
  assert.equal(failedRetry.outputText, "Keep the result.");
});

test("records with invalid modes or statuses are removed", async () => {
  const storage = new MemoryStorage();
  storage.items.set(
    "tweetcraft.history.v2.entry.invalid-mode",
    JSON.stringify(historyEntry({ id: "invalid-mode", mode: "thread" as HistoryEntry["mode"] })),
  );
  storage.items.set(
    "tweetcraft.history.v2.entry.invalid-status",
    JSON.stringify(historyEntry({ id: "invalid-status", status: "done" as HistoryEntry["status"] })),
  );
  const repository = createHistoryRepository(storage, {
    now: () => 1_000,
    createId: () => "unused",
  });

  assert.deepEqual(await repository.getHistory(), []);
  assert.equal(storage.items.has("tweetcraft.history.v2.entry.invalid-mode"), false);
  assert.equal(storage.items.has("tweetcraft.history.v2.entry.invalid-status"), false);
});
