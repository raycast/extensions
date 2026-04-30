import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadDocDetail, loadInventory } from "../lib/docs-source";
import type { InventoryItem } from "../lib/inventory";

const linspaceItem: InventoryItem = {
  id: "numpy.linspace",
  name: "numpy.linspace",
  shortName: "linspace",
  role: "py:function",
  url: "https://numpy.org/doc/stable/reference/generated/numpy.linspace.html",
  docPath: "reference/generated/numpy.linspace.html#numpy.linspace",
  displayName: "numpy.linspace",
};

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { force: true, recursive: true });
  }
  tempDirs.length = 0;
});

describe("loadInventory", () => {
  it("falls back to local docs in online mode when remote loading fails", async () => {
    const localDocsDirectory = createLocalDocsDirectory();
    const stableDir = path.join(localDocsDirectory, "stable");
    mkdirSync(stableDir, { recursive: true });
    writeFileSync(path.join(stableDir, "objects.inv"), buildInventoryFixture());

    const result = await loadInventory(
      {
        localDocsDirectory,
        mode: "online",
      },
      {
        fetchImpl: vi.fn(async () => {
          throw new Error("certificate failure");
        }) as typeof fetch,
        readBinaryFileImpl: async (filePath) => readFileSync(filePath),
        readTextFileImpl: async (filePath) => readFileSync(filePath, "utf8"),
      },
    );

    expect(result.source).toBe("local");
    expect(result.remoteError?.message).toBe("certificate failure");
    expect(result.data.some((item) => item.id === "numpy.linspace")).toBe(true);
  });

  it("follows a stable symlink file from Windows checkouts", async () => {
    const localDocsDirectory = createLocalDocsDirectory();
    const versionDir = path.join(localDocsDirectory, "2.3");
    mkdirSync(versionDir, { recursive: true });
    writeFileSync(path.join(localDocsDirectory, "stable"), "2.3\n");
    writeFileSync(path.join(versionDir, "objects.inv"), buildInventoryFixture());

    const result = await loadInventory(
      {
        localDocsDirectory,
        mode: "local",
      },
      {
        fetchImpl: vi.fn() as typeof fetch,
        readBinaryFileImpl: async (filePath) => readFileSync(filePath),
        readTextFileImpl: async (filePath) => readFileSync(filePath, "utf8"),
      },
    );

    expect(result.source).toBe("local");
    expect(result.data.some((item) => item.id === "numpy.linspace")).toBe(true);
  });

  it("surfaces the remote error when online mode has no local docs fallback", async () => {
    await expect(
      loadInventory(
        {
          mode: "online",
        },
        {
          fetchImpl: vi.fn(async () => {
            throw new Error("certificate failure");
          }) as typeof fetch,
          readBinaryFileImpl: async (filePath) => readFileSync(filePath),
          readTextFileImpl: async (filePath) => readFileSync(filePath, "utf8"),
        },
      ),
    ).rejects.toThrow("certificate failure");
  });
});

describe("loadDocDetail", () => {
  it("loads documentation detail from a local docs directory", async () => {
    const localDocsDirectory = createLocalDocsDirectory();
    const referenceDir = path.join(localDocsDirectory, "stable/reference/generated");
    mkdirSync(referenceDir, { recursive: true });
    writeFileSync(
      path.join(referenceDir, "numpy.linspace.html"),
      readFileSync(path.join(process.cwd(), "src/__tests__/fixtures/numpy.linspace.html"), "utf8"),
    );

    const result = await loadDocDetail({
      inventorySource: "local",
      item: linspaceItem,
      localDocsDirectory,
      mode: "local",
    });

    expect(result.source).toBe("local");
    expect(result.data?.signature).toContain("numpy.linspace");
  });

  it("loads documentation detail through a stable symlink file from Windows checkouts", async () => {
    const localDocsDirectory = createLocalDocsDirectory();
    const referenceDir = path.join(localDocsDirectory, "2.3/reference/generated");
    mkdirSync(referenceDir, { recursive: true });
    writeFileSync(path.join(localDocsDirectory, "stable"), "2.3\n");
    writeFileSync(
      path.join(referenceDir, "numpy.linspace.html"),
      readFileSync(path.join(process.cwd(), "src/__tests__/fixtures/numpy.linspace.html"), "utf8"),
    );

    const result = await loadDocDetail({
      inventorySource: "local",
      item: linspaceItem,
      localDocsDirectory,
      mode: "local",
    });

    expect(result.source).toBe("local");
    expect(result.data?.signature).toContain("numpy.linspace");
  });
});

function createLocalDocsDirectory(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "numpy-docs-"));
  tempDirs.push(dir);
  return dir;
}

function buildInventoryFixture(): Buffer {
  const header = [
    "# Sphinx inventory version 2",
    "# Project: NumPy",
    "# Version: stable",
    "# The remainder of this file is compressed using zlib.",
  ].join("\n");
  const body = "numpy.linspace py:function 1 reference/generated/numpy.linspace.html#numpy.linspace -";

  return Buffer.concat([Buffer.from(`${header}\n`, "utf8"), deflateSync(`${body}\n`)]);
}
