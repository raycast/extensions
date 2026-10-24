import { describe, expect, it, vi } from "vitest";
import { KeitoError } from "./errors";
import { favoritesKey } from "./favorites";
import {
  credentialFingerprint,
  invalidateSessionOnSetupError,
  resetLocalData,
  resolveSession,
  SESSION_KEY,
} from "./session";
import { KeitoIdentity } from "./types";
import { memoryStore, TEST_ACCOUNT, TEST_TOKEN } from "./testUtils";

const identity = (userId: string, companyId = TEST_ACCOUNT): KeitoIdentity => ({
  userId,
  name: "Ada",
  roles: ["member"],
  companyId,
  credentialType: "full_access",
  features: [],
  settings: { requireNotes: false },
});

const creds = { token: TEST_TOKEN, accountId: TEST_ACCOUNT };

describe("resolveSession", () => {
  it("verifies once, then reuses the stored identity without storing the key", async () => {
    const store = memoryStore();
    const fetchIdentity = vi.fn(async () => identity("u1"));
    const first = await resolveSession(creds, fetchIdentity, store);
    const second = await resolveSession(creds, fetchIdentity, store);
    expect(first).toMatchObject({ verified: true, scope: `${TEST_ACCOUNT}:u1`, accountChanged: false });
    expect(second).toMatchObject({ verified: false, scope: `${TEST_ACCOUNT}:u1` });
    expect(fetchIdentity).toHaveBeenCalledTimes(1);
    const stored = store.data.get(SESSION_KEY)!;
    expect(stored).not.toContain(TEST_TOKEN);
    expect(stored).toContain(credentialFingerprint(creds));
  });

  it("re-verifies when the key or Company ID changes and reports an account switch", async () => {
    const store = memoryStore();
    await resolveSession(creds, async () => identity("u1"), store);
    const changed = await resolveSession(
      { ...creds, token: "kto_rotated" },
      async () => identity("u2", "cmother"),
      store,
    );
    expect(changed).toMatchObject({ verified: true, accountChanged: true, scope: "cmother:u2" });
    expect(favoritesKey(changed.scope)).not.toBe(favoritesKey(`${TEST_ACCOUNT}:u1`));

    const rotatedSameUser = await resolveSession(
      { ...creds, token: "kto_rotated_again" },
      async () => identity("u2", "cmother"),
      store,
    );
    expect(rotatedSameUser).toMatchObject({ verified: true, accountChanged: false });
  });

  it("drops the previous identity when new credentials fail verification", async () => {
    const store = memoryStore();
    await resolveSession(creds, async () => identity("u1"), store);
    const failing = async (): Promise<KeitoIdentity> => {
      throw new KeitoError("invalid_credentials", "rejected");
    };
    await expect(resolveSession({ ...creds, token: "kto_wrong" }, failing, store)).rejects.toMatchObject({
      kind: "invalid_credentials",
    });
    expect(store.data.has(SESSION_KEY)).toBe(false);
    // Going back to the old key must verify again rather than trusting stale state.
    const fetchIdentity = vi.fn(async () => identity("u1"));
    await resolveSession(creds, fetchIdentity, store);
    expect(fetchIdentity).toHaveBeenCalledTimes(1);
  });

  it("re-verifies stale sessions and on request", async () => {
    const store = memoryStore();
    const fetchIdentity = vi.fn(async () => identity("u1"));
    await resolveSession(creds, fetchIdentity, store, { now: new Date("2026-10-15T08:00:00Z") });
    await resolveSession(creds, fetchIdentity, store, { now: new Date("2026-10-15T09:00:00Z") });
    expect(fetchIdentity).toHaveBeenCalledTimes(1);
    await resolveSession(creds, fetchIdentity, store, { now: new Date("2026-10-15T15:00:00Z") });
    await resolveSession(creds, fetchIdentity, store, { force: true, now: new Date("2026-10-15T15:01:00Z") });
    expect(fetchIdentity).toHaveBeenCalledTimes(3);
  });
});

describe("credential problems and reset", () => {
  it("clears the stored identity only for setup errors", async () => {
    const store = memoryStore({ [SESSION_KEY]: "{}" });
    expect(await invalidateSessionOnSetupError(new KeitoError("network", "offline"), store)).toBe(false);
    expect(store.data.has(SESSION_KEY)).toBe(true);
    expect(await invalidateSessionOnSetupError(new KeitoError("read_only_key", "read only"), store)).toBe(true);
    expect(store.data.has(SESSION_KEY)).toBe(false);
  });

  it("resets cached data but keeps favorites unless asked", async () => {
    const store = memoryStore({
      [SESSION_KEY]: "{}",
      "keito:c:u:lastProject": "{}",
      "keito:c:u:favorites": "[]",
      "keito:c2:u:favorites": "[]",
    });
    expect(await resetLocalData(store)).toBe(2);
    expect([...store.data.keys()].sort()).toEqual(["keito:c2:u:favorites", "keito:c:u:favorites"]);
    expect(await resetLocalData(store, { includeFavorites: true })).toBe(2);
    expect(store.data.size).toBe(0);
  });
});
