import { describe, it, expect } from "vitest";
import { exportPlain, exportEncrypted, importData } from "./portable";
import { emptyStore, Store } from "./types";

function sample(): Store {
  const s = emptyStore();
  s.secrets.push({
    id: "1",
    name: "API",
    value: "sk-123",
    folder: ["work"],
    tags: ["prod"],
    createdAt: 1,
    updatedAt: 1,
  });
  return s;
}

describe("portable", () => {
  it("plain export round-trips", () => {
    const text = exportPlain(sample());
    expect(text).toContain("sk-123");
    expect(importData(text).secrets[0].value).toBe("sk-123");
  });

  it("encrypted export hides the value and round-trips with the passphrase", () => {
    const text = exportEncrypted(sample(), "correct horse");
    expect(text).not.toContain("sk-123");
    expect(importData(text, "correct horse").secrets[0].value).toBe("sk-123");
  });

  it("wrong passphrase throws", () => {
    const text = exportEncrypted(sample(), "correct horse");
    expect(() => importData(text, "wrong")).toThrow();
  });

  it("encrypted import without a passphrase throws a clear error", () => {
    const text = exportEncrypted(sample(), "pw");
    expect(() => importData(text)).toThrow(/passphrase required/);
  });

  it("embeds scrypt params in the encrypted envelope", () => {
    const env = JSON.parse(exportEncrypted(sample(), "pw"));
    expect(env.kdf).toEqual({ N: 2 ** 17, r: 8, p: 1 });
  });

  it("rejects a malformed plain import instead of corrupting the store", () => {
    // Parseable JSON but a secret missing required fields must be rejected.
    const bad = JSON.stringify({ secrets: [{ name: "x" }], folders: [] });
    expect(() => importData(bad)).toThrow();
  });
});
