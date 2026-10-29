import "./raycast-mock";
import { describe, expect, test } from "bun:test";
import {
  createPendingApprovalStore,
  parsePendingApproval,
  pendingApprovalKey,
  pendingApprovalReference,
  type PendingApprovalStorage,
} from "../src/lib/pending-approvals";
import type { ExecutionResult } from "../src/lib/types";

class MemoryStorage implements PendingApprovalStorage {
  readonly items: Record<string, string | number | boolean> = {};

  async allItems() {
    return { ...this.items };
  }

  async setItem(key: string, value: string) {
    this.items[key] = value;
  }

  async removeItem(key: string) {
    delete this.items[key];
  }
}

function paused(
  executionId: string,
  address = "tools.github.user.main.createIssue",
  expiresAt?: string,
): ExecutionResult {
  return {
    status: "paused",
    text: "private terms",
    structured: {
      executionId,
      ...(expiresAt ? { expiresAt } : {}),
      interaction: {
        kind: "form",
        address,
        args: { secret: "never persist" },
        meta: { terms: "never persist" },
      },
    },
  };
}

describe("pending approval references", () => {
  test("stores only the safe reference fields and derives a friendly title", () => {
    const reference = pendingApprovalReference(
      paused("exec-1", "tools.github.user.main.createIssue", "2026-09-11T12:15:00.000Z"),
      Date.UTC(2026, 8, 11, 12),
    );

    expect(reference).toEqual({
      executionId: "exec-1",
      title: "Review Create Issue",
      createdAt: Date.UTC(2026, 8, 11, 12),
      expiresAt: Date.UTC(2026, 8, 11, 12, 15),
    });
    expect(JSON.stringify(reference)).not.toContain("secret");
    expect(JSON.stringify(reference)).not.toContain("terms");
  });

  test("keeps a pause without an explicit server deadline", () => {
    expect(pendingApprovalReference(paused("exec-1"), 100)?.expiresAt).toBeUndefined();
  });

  test("uses separate encoded keys for accounts and execution IDs", () => {
    expect(pendingApprovalKey("account:a", "execution/1")).toBe(
      "executor.pending-approval.v1:account%3Aa:execution%2F1",
    );
    expect(pendingApprovalKey("account:b", "execution/1")).not.toBe(pendingApprovalKey("account:a", "execution/1"));
  });

  test("rejects malformed records and records containing additional fields", () => {
    expect(parsePendingApproval("not json")).toBeUndefined();
    expect(
      parsePendingApproval(JSON.stringify({ executionId: "x", title: "Review X", createdAt: 1, args: {} })),
    ).toBeUndefined();
    expect(
      parsePendingApproval(JSON.stringify({ executionId: "x", title: "Review X", createdAt: 1, expiresAt: "soon" })),
    ).toBeUndefined();
  });

  test("lists only the selected account, removes known expired and invalid records, and preserves undated records", async () => {
    const storage = new MemoryStorage();
    const now = Date.UTC(2026, 8, 11, 12);
    const store = createPendingApprovalStore(storage, () => now);
    await store.remember("account-a", paused("undated"));
    await store.remember("account-a", paused("expired", undefined, new Date(now - 1).toISOString()));
    await store.remember("account-b", paused("other-account"));
    storage.items[pendingApprovalKey("account-a", "invalid")] = JSON.stringify({ executionId: "invalid" });

    const listed = await store.list("account-a");

    expect(listed.map((record) => record.executionId)).toEqual(["undated"]);
    expect(storage.items[pendingApprovalKey("account-a", "expired")]).toBeUndefined();
    expect(storage.items[pendingApprovalKey("account-a", "invalid")]).toBeUndefined();
    expect(storage.items[pendingApprovalKey("account-b", "other-account")]).toBeDefined();
  });

  test("concurrent remembers cannot overwrite one another", async () => {
    const storage = new MemoryStorage();
    const store = createPendingApprovalStore(storage, () => 100);

    await Promise.all([store.remember("account", paused("one")), store.remember("account", paused("two"))]);

    expect((await store.list("account")).map((record) => record.executionId).sort()).toEqual(["one", "two"]);
  });
});
