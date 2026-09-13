import { describe, expect, it } from "vitest";

import { OAuthSessionKeyStore } from "./OAuthSessionKeyStore";

const SESSION = "oauth:01890f67-7d23-7d8a-b456-426614174000";

describe("OAuthSessionKeyStore", () => {
  it("uses exact independent target-specific LocalStorage keys", async () => {
    const storage = memoryStorage();
    const mcp = new OAuthSessionKeyStore("mcp", storage);
    const openapi = new OAuthSessionKeyStore("openapi", storage);
    await mcp.set(SESSION);
    await openapi.set("oauth:01890f67-7d23-7d8a-b456-426614174001");
    await expect(mcp.get()).resolves.toBe(SESSION);
    await expect(openapi.get()).resolves.toBe("oauth:01890f67-7d23-7d8a-b456-426614174001");
    expect(storage.values).toEqual({
      "ticktick.oauth.session.v1.mcp": SESSION,
      "ticktick.oauth.session.v1.openapi": "oauth:01890f67-7d23-7d8a-b456-426614174001",
    });
    await mcp.remove();
    expect(storage.values).not.toHaveProperty("ticktick.oauth.session.v1.mcp");
  });

  it("removes malformed saved values and rejects invalid writes", async () => {
    const storage = memoryStorage({ "ticktick.oauth.session.v1.mcp": "oauth:not-a-uuid" });
    const store = new OAuthSessionKeyStore("mcp", storage);
    await expect(store.get()).resolves.toBeUndefined();
    expect(storage.removed).toEqual(["ticktick.oauth.session.v1.mcp"]);
    await expect(store.set("oauth:token-bearing-secret")).rejects.toThrow("OAuth session key is invalid.");
    expect(storage.values).not.toHaveProperty("ticktick.oauth.session.v1.mcp");
  });
});

function memoryStorage(initial: Record<string, string> = {}) {
  const result = {
    values: { ...initial },
    removed: [] as string[],
    getItem: async (key: string) => result.values[key],
    setItem: async (key: string, value: string) => {
      result.values[key] = value;
    },
    removeItem: async (key: string) => {
      delete result.values[key];
      result.removed.push(key);
    },
  };
  return result;
}
