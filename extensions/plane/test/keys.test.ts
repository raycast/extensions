import { describe, expect, it } from "vitest";
import {
  findStoredWorkspaceSlug,
  LEGACY_STORAGE_WORKSPACE_SLUG_KEY,
  legacyWorkspaceSlugKeys,
  SlugStorage,
  STORAGE_WORKSPACE_SLUG_KEY,
} from "../src/helpers/keys";

describe("workspace slug storage keys", () => {
  it("never contains the raw token", () => {
    const token = "plane_api_secret123";
    const key = STORAGE_WORKSPACE_SLUG_KEY(token);
    expect(key).not.toContain(token);
    expect(key).toMatch(/^workspace-slug:sha256:[0-9a-f]{64}$/);
    expect(LEGACY_STORAGE_WORKSPACE_SLUG_KEY(token)).toBe(`workspace-slug:${token}`);
  });
});

function memoryStorage(entries: Record<string, string> = {}): SlugStorage & { map: Map<string, string> } {
  const map = new Map(Object.entries(entries));
  return {
    map,
    getItem: async <T extends string>(key: string) => map.get(key) as T | undefined,
    setItem: async (key, value) => void map.set(key, value),
    removeItem: async (key) => void map.delete(key),
  };
}

describe("findStoredWorkspaceSlug", () => {
  const token = "plane_api_secret123";
  const padded = " plane_api_secret123\n";
  const key = STORAGE_WORKSPACE_SLUG_KEY(token);

  it("prefers the hashed key", async () => {
    const storage = memoryStorage({ [key]: "acme", [LEGACY_STORAGE_WORKSPACE_SLUG_KEY(token)]: "old" });
    expect(await findStoredWorkspaceSlug(storage, key, legacyWorkspaceSlugKeys(token))).toBe("acme");
  });

  it("migrates and removes the plaintext key of the trimmed token", async () => {
    const legacyKey = LEGACY_STORAGE_WORKSPACE_SLUG_KEY(token);
    const storage = memoryStorage({ [legacyKey]: "acme" });
    expect(await findStoredWorkspaceSlug(storage, key, legacyWorkspaceSlugKeys(token))).toBe("acme");
    expect(storage.map.get(key)).toBe("acme");
    expect(storage.map.has(legacyKey)).toBe(false);
  });

  it("migrates the hashed key of an untrimmed API key", async () => {
    const storage = memoryStorage({ [STORAGE_WORKSPACE_SLUG_KEY(padded)]: "acme" });
    expect(await findStoredWorkspaceSlug(storage, key, legacyWorkspaceSlugKeys(token, padded))).toBe("acme");
    expect(storage.map.get(key)).toBe("acme");
  });

  it("migrates and removes the plaintext key of an untrimmed API key", async () => {
    const legacyKey = LEGACY_STORAGE_WORKSPACE_SLUG_KEY(padded);
    const storage = memoryStorage({ [legacyKey]: "acme" });
    expect(await findStoredWorkspaceSlug(storage, key, legacyWorkspaceSlugKeys(token, padded))).toBe("acme");
    expect(storage.map.get(key)).toBe("acme");
    expect([...storage.map.keys()].some((name) => name.includes(token))).toBe(false);
  });

  it("returns undefined when nothing is stored", async () => {
    const storage = memoryStorage();
    expect(await findStoredWorkspaceSlug(storage, key, legacyWorkspaceSlugKeys(token, padded))).toBeUndefined();
    expect(storage.map.size).toBe(0);
  });
});
