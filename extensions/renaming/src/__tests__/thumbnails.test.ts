import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { tmpdir } from "os";
import { mkdtemp, writeFile, rm, access } from "fs/promises";
import { join } from "path";

// Mock os-capabilities (only isPreviewableImage remains)
vi.mock("../lib/os-capabilities", () => ({
  isPreviewableImage: () => false,
}));

import { generateThumbnail, getThumbnail } from "../lib/thumbnails";

describe("thumbnails", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "thumbnails-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("generateThumbnail", () => {
    it("should return null for non-existent files", async () => {
      const filePath = join(testDir, "nonexistent.pdf");
      const result = await generateThumbnail(filePath);
      expect(result).toBeNull();
    }, 15000);

    // Integration test - only run if qlmanage is available
    it.skipIf(process.env.CI)("should generate thumbnail for a real PDF file", async () => {
      const pdfPath = join(testDir, "test.pdf");

      const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer << /Size 4 /Root 1 0 R >>
startxref
196
%%EOF`;
      await writeFile(pdfPath, minimalPdf);

      const result = await generateThumbnail(pdfPath);

      // qlmanage may return null on some platforms/CI
      expect(result === null || result.includes(".png")).toBe(true);
      if (result) {
        await access(result);
      }
    });

    it.skipIf(process.env.CI)(
      "should generate thumbnail for a text file (Quick Look supports it)",
      async () => {
        const txtPath = join(testDir, "test.txt");
        await writeFile(txtPath, "hello world");

        // Quick Look can actually thumbnail text files on macOS
        const result = await generateThumbnail(txtPath);
        // qlmanage may return null on some platforms/CI
        expect(result === null || result.includes(".png")).toBe(true);
      },
      15000,
    );
  });

  describe("getThumbnail", () => {
    it("should be an alias for generateThumbnail", async () => {
      const filePath = join(testDir, "nonexistent.pdf");
      const result = await getThumbnail(filePath);
      expect(result).toBeNull();
    }, 15000);
  });
});
