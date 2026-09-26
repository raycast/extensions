import { describe, expect, it } from "bun:test";
import { parseSettingsTransfer, serializeSettingsTransfer } from "../src/lib/settings-transfer";

describe("settings transfer", () => {
  it("round-trips categories and both sort groups; rejects malformed input", () => {
    const value = { category: "net", sort: { key: "procs", dir: "desc" }, networkSort: { key: "down", dir: "asc" } } as const;
    expect(parseSettingsTransfer(serializeSettingsTransfer(value))).toEqual(value);
    expect(() => parseSettingsTransfer('{"format":"other","version":1}')).toThrow();
  });
});
