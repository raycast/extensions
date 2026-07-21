import { describe, it, expect } from "vitest";
import { MemoryKeyStore, KeychainKeyStore, isItemNotFound } from "./keystore";

describe("MemoryKeyStore", () => {
  it("returns a stable 32-byte key", async () => {
    const ks = new MemoryKeyStore();
    const a = await ks.getKey();
    const b = await ks.getKey();
    expect(a).toHaveLength(32);
    expect(a.equals(b)).toBe(true);
    expect(await ks.hasKey()).toBe(true);
  });
});

describe("isItemNotFound", () => {
  it("is true for exit code 44", () => {
    expect(isItemNotFound({ code: 44 })).toBe(true);
  });
  it("is false for other exit codes and non-errors", () => {
    expect(isItemNotFound({ code: 1 })).toBe(false);
    expect(isItemNotFound(new Error("boom"))).toBe(false);
    expect(isItemNotFound(null)).toBe(false);
  });
});

// Real Keychain test mutates the login keychain; run explicitly:
//   RUN_KEYCHAIN_TESTS=1 npx vitest run src/lib/keystore.test.ts
describe.runIf(process.env.RUN_KEYCHAIN_TESTS)("KeychainKeyStore", () => {
  it("creates then returns the same key", async () => {
    const ks = new KeychainKeyStore("raycast-secrets-manager-test");
    const a = await ks.getKey();
    const b = await ks.getKey();
    expect(a).toHaveLength(32);
    expect(a.equals(b)).toBe(true);
  });
});
