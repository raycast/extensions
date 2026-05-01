import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { isFlagSet, setFlag, clearFlag, toggleFlag } from "../flags";

describe("flags", () => {
  let tmpDir: string;
  let flagPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ls-flags-"));
    flagPath = path.join(tmpDir, "test.off");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("isFlagSet returns false when flag absent", async () => {
    await expect(isFlagSet(flagPath)).resolves.toBe(false);
  });

  test("setFlag creates the file; isFlagSet returns true", async () => {
    await setFlag(flagPath);
    await expect(isFlagSet(flagPath)).resolves.toBe(true);
  });

  test("clearFlag removes the file; isFlagSet returns false", async () => {
    await setFlag(flagPath);
    await clearFlag(flagPath);
    await expect(isFlagSet(flagPath)).resolves.toBe(false);
  });

  test("clearFlag is idempotent when file missing", async () => {
    await expect(clearFlag(flagPath)).resolves.not.toThrow();
  });

  test("toggleFlag returns new state (true→false, false→true)", async () => {
    await expect(toggleFlag(flagPath)).resolves.toBe(true);
    await expect(toggleFlag(flagPath)).resolves.toBe(false);
  });

  test("setFlag creates parent directories if missing", async () => {
    const nested = path.join(tmpDir, "a", "b", "c", "test.off");
    await setFlag(nested);
    await expect(isFlagSet(nested)).resolves.toBe(true);
  });
});
