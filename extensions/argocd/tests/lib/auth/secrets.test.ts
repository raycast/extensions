import { describe, expect, it, vi } from "vitest";
import {
  SecretError,
  clearInstanceSecrets,
  clearToken,
  isSecretKey,
  normalizeToken,
  readSessionRaw,
  readToken,
  sessionKey,
  tokenKey,
  writeSessionRaw,
  writeToken,
  writeVerified,
  type SecretStore,
} from "../../../src/lib/auth/secrets";

const SECRET = "a-token-value";

/** An in-memory store, so nothing is written and the contract is all that is tested. */
function memoryStore(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  const store: SecretStore = {
    read: vi.fn(async (key: string) => values.get(key)),
    write: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    clear: vi.fn(async (key: string) => {
      values.delete(key);
    }),
  };
  return { store, values };
}

describe("keys", () => {
  it("keeps the token and the session apart for one instance", () => {
    expect(tokenKey("i1")).not.toBe(sessionKey("i1"));
    expect(tokenKey("i1")).toBe("secret/v1/i1/token");
    expect(sessionKey("i1")).toBe("secret/v1/i1/sso");
  });

  it("keeps instances apart", () => {
    expect(tokenKey("i1")).not.toBe(tokenKey("i2"));
  });

  it("recognises its own keys and nothing else", () => {
    expect(isSecretKey(tokenKey("i1"), "i1")).toBe(true);
    expect(isSecretKey(sessionKey("i1"), "i1")).toBe(true);
    expect(isSecretKey(tokenKey("i2"), "i1")).toBe(false);
    expect(isSecretKey("instances/v1", "i1")).toBe(false);
  });
});

describe("normalizeToken", () => {
  it("trims", () => {
    expect(normalizeToken(`  ${SECRET}\n`)).toBe(SECRET);
  });

  it("refuses an empty value, which is what the earlier bug stored silently", () => {
    expect(() => normalizeToken("")).toThrowError(SecretError);
    expect(() => normalizeToken("   ")).toThrowError(/empty/);
  });

  it("refuses an embedded line break, which means a bad paste", () => {
    expect(() => normalizeToken(`${SECRET}\nmore`)).toThrowError(/one line/);
  });
});

describe("writeVerified", () => {
  it("stores the value", async () => {
    const { store, values } = memoryStore();
    await writeVerified(store, "k", SECRET);
    expect(values.get("k")).toBe(SECRET);
  });

  it("throws when the store kept something else, rather than trusting the call returning", async () => {
    // The habit worth keeping from the keychain: a write whose effect is not checked is how
    // "stored" came to mean "the call returned".
    const store: SecretStore = {
      write: vi.fn(async () => undefined),
      read: vi.fn(async () => "something else"),
      clear: vi.fn(async () => undefined),
    };
    await expect(writeVerified(store, "k", SECRET)).rejects.toThrowError(/not stored/);
  });

  it("throws when the store kept nothing at all", async () => {
    const store: SecretStore = {
      write: vi.fn(async () => undefined),
      read: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined),
    };
    await expect(writeVerified(store, "k", SECRET)).rejects.toThrowError(/not stored/);
  });
});

describe("tokens", () => {
  it("round-trips", async () => {
    const { store } = memoryStore();
    await writeToken(store, "i1", `  ${SECRET}  `);
    await expect(readToken(store, "i1")).resolves.toBe(SECRET);
  });

  it("returns undefined when there is nothing, and when the stored value is empty", async () => {
    const { store } = memoryStore({ [tokenKey("i2")]: "" });
    await expect(readToken(store, "i1")).resolves.toBeUndefined();
    await expect(readToken(store, "i2")).resolves.toBeUndefined();
  });

  it("refuses to store an empty token without touching the store", async () => {
    const { store } = memoryStore();
    await expect(writeToken(store, "i1", "  ")).rejects.toThrowError(SecretError);
    expect(store.write).not.toHaveBeenCalled();
  });

  it("clears", async () => {
    const { store } = memoryStore();
    await writeToken(store, "i1", SECRET);
    await clearToken(store, "i1");
    await expect(readToken(store, "i1")).resolves.toBeUndefined();
  });
});

describe("sessions", () => {
  it("round-trips the serialized session", async () => {
    const { store } = memoryStore();
    const raw = JSON.stringify({ idToken: "t", refreshToken: "r" });
    await writeSessionRaw(store, "i1", raw);
    await expect(readSessionRaw(store, "i1")).resolves.toBe(raw);
  });

  it("does not collide with the token of the same instance", async () => {
    const { store } = memoryStore();
    await writeToken(store, "i1", SECRET);
    await writeSessionRaw(store, "i1", "{}");
    await expect(readToken(store, "i1")).resolves.toBe(SECRET);
    await expect(readSessionRaw(store, "i1")).resolves.toBe("{}");
  });
});

describe("clearInstanceSecrets", () => {
  it("removes both, so a removed instance leaves no credential behind", async () => {
    const { store, values } = memoryStore();
    await writeToken(store, "i1", SECRET);
    await writeSessionRaw(store, "i1", "{}");
    await clearInstanceSecrets(store, "i1");
    expect([...values.keys()]).toEqual([]);
  });

  it("leaves another instance's secrets alone", async () => {
    const { store, values } = memoryStore();
    await writeToken(store, "i1", SECRET);
    await writeToken(store, "i2", "other");
    await clearInstanceSecrets(store, "i1");
    expect([...values.keys()]).toEqual([tokenKey("i2")]);
  });
});
