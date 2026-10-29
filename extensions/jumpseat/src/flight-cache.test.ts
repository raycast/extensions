import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  directory: "",
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
}));
vi.mock("@raycast/api", () => ({
  Cache: class {
    get storageDirectory() {
      return mocks.directory;
    }
  },
  LocalStorage: {
    getItem: mocks.getItem,
    removeItem: mocks.removeItem,
    setItem: mocks.setItem,
  },
}));
import { clearFlightCache, migrateFlightCache } from "./flight-cache";

describe("flight cache lifecycle", () => {
  let root: string;
  beforeEach(() => {
    vi.resetAllMocks();
    root = mkdtempSync(join(tmpdir(), "jumpseat-cache-test-"));
    mocks.directory = join(root, "cache");
    mkdirSync(join(mocks.directory, "old-function-hash"), { recursive: true });
    writeFileSync(
      join(mocks.directory, "old-function-hash", "flights"),
      "PRIVATE-BOOKING",
    );
    writeFileSync(join(root, "tokens"), "separate-token-storage");
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("removes old namespaced cache data before recording migration", async () => {
    mocks.setItem.mockImplementation(async () => {
      expect(existsSync(mocks.directory)).toBe(false);
    });
    await migrateFlightCache();
    expect(mocks.setItem).toHaveBeenCalledWith(
      "jumpseat-redacted-flight-cache-v2",
      true,
    );
    expect(mocks.removeItem).toHaveBeenCalledWith(
      "jumpseat-redacted-flight-cache-v1",
    );
    expect(existsSync(join(root, "tokens"))).toBe(true);
  });

  it("keeps the redacted cache on subsequent runs", async () => {
    mocks.getItem.mockResolvedValue(true);
    await migrateFlightCache();
    expect(existsSync(mocks.directory)).toBe(true);
    expect(mocks.setItem).not.toHaveBeenCalled();
  });

  it("clears every namespace at disconnect, even when already empty", () => {
    clearFlightCache();
    clearFlightCache();
    expect(existsSync(mocks.directory)).toBe(false);
    expect(existsSync(join(root, "tokens"))).toBe(true);
  });
});
