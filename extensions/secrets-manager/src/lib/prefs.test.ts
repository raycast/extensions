import { describe, it, expect } from "vitest";
import { backupConfigFrom } from "./prefs";

describe("backupConfigFrom", () => {
  it("uses defaults when fields are empty", () => {
    const cfg = backupConfigFrom({}, "/support/backups");
    expect(cfg).toEqual({ enabled: true, dir: "/support/backups", retention: 10 });
  });

  it("honors provided values", () => {
    const cfg = backupConfigFrom({ enableBackups: false, backupDir: "/custom", retention: "3" }, "/support/backups");
    expect(cfg).toEqual({ enabled: false, dir: "/custom", retention: 3 });
  });

  it("falls back to default retention on non-numeric input", () => {
    expect(backupConfigFrom({ retention: "abc" }, "/d").retention).toBe(10);
  });
});
