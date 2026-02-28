/**
 * Tests for the FIRE chart export utilities.
 *
 * Covers:
 * - writeSvgToTempFile: writes SVG to a temp directory and returns the path
 * - saveSvgToDownloads: writes SVG to ~/Downloads and returns the path
 *
 * Uses real filesystem operations (temp dirs) for integration-level confidence.
 * Each test cleans up after itself.
 */

import { readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir, homedir } from "os";
import { writeSvgToTempFile, saveSvgToDownloads } from "../utils/fire-chart-export";

// ──────────────────────────────────────────
// Constants
// ──────────────────────────────────────────

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><text>Test</text></svg>';
const TEMP_SUBDIR = "raycast-fire-charts";

// ──────────────────────────────────────────
// writeSvgToTempFile
// ──────────────────────────────────────────

describe("writeSvgToTempFile", () => {
  const cleanupPaths: string[] = [];

  afterEach(async () => {
    for (const p of cleanupPaths) {
      try {
        await rm(p, { force: true });
      } catch {
        // ignore cleanup errors
      }
    }
    cleanupPaths.length = 0;
  });

  it("writes SVG content to a file and returns the path", async () => {
    const filePath = await writeSvgToTempFile(SAMPLE_SVG, "test-chart.svg");
    cleanupPaths.push(filePath);

    const content = await readFile(filePath, "utf-8");
    expect(content).toBe(SAMPLE_SVG);
  });

  it("returns a path inside the OS temp directory", async () => {
    const filePath = await writeSvgToTempFile(SAMPLE_SVG, "test-location.svg");
    cleanupPaths.push(filePath);

    expect(filePath).toContain(tmpdir());
    expect(filePath).toContain(TEMP_SUBDIR);
  });

  it("returns a path ending with the specified filename", async () => {
    const filePath = await writeSvgToTempFile(SAMPLE_SVG, "my-chart.svg");
    cleanupPaths.push(filePath);

    expect(filePath.endsWith("my-chart.svg")).toBe(true);
  });

  it("overwrites an existing file with the same name", async () => {
    const firstContent = "<svg>first</svg>";
    const secondContent = "<svg>second</svg>";

    const path1 = await writeSvgToTempFile(firstContent, "overwrite-test.svg");
    cleanupPaths.push(path1);

    const path2 = await writeSvgToTempFile(secondContent, "overwrite-test.svg");
    // Should be the same path
    expect(path2).toBe(path1);

    const content = await readFile(path2, "utf-8");
    expect(content).toBe(secondContent);
  });

  it("sanitises filenames with path separators", async () => {
    const filePath = await writeSvgToTempFile(SAMPLE_SVG, "../../evil.svg");
    cleanupPaths.push(filePath);

    // Should NOT contain directory traversal
    expect(filePath).not.toContain("../../");
    // Should still be inside the temp subdir
    expect(filePath).toContain(TEMP_SUBDIR);

    const content = await readFile(filePath, "utf-8");
    expect(content).toBe(SAMPLE_SVG);
  });

  it("sanitises filenames with backslashes", async () => {
    const filePath = await writeSvgToTempFile(SAMPLE_SVG, "..\\..\\evil.svg");
    cleanupPaths.push(filePath);

    expect(filePath).not.toContain("..\\");
    expect(filePath).toContain(TEMP_SUBDIR);
  });

  it("sanitises filenames with null bytes", async () => {
    const filePath = await writeSvgToTempFile(SAMPLE_SVG, "file\0name.svg");
    cleanupPaths.push(filePath);

    expect(filePath).not.toContain("\0");
    expect(filePath).toContain(TEMP_SUBDIR);
  });

  it("handles empty SVG content", async () => {
    const filePath = await writeSvgToTempFile("", "empty.svg");
    cleanupPaths.push(filePath);

    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("");
  });

  it("handles large SVG content", async () => {
    const largeSvg = "<svg>" + "x".repeat(100_000) + "</svg>";
    const filePath = await writeSvgToTempFile(largeSvg, "large.svg");
    cleanupPaths.push(filePath);

    const content = await readFile(filePath, "utf-8");
    expect(content).toBe(largeSvg);
  });

  it("creates the temp subdirectory if it does not exist", async () => {
    // Remove the subdirectory first (if it exists)
    const subdir = join(tmpdir(), TEMP_SUBDIR);
    try {
      await rm(subdir, { recursive: true, force: true });
    } catch {
      // ignore
    }

    const filePath = await writeSvgToTempFile(SAMPLE_SVG, "fresh-dir-test.svg");
    cleanupPaths.push(filePath);

    const content = await readFile(filePath, "utf-8");
    expect(content).toBe(SAMPLE_SVG);
  });
});

// ──────────────────────────────────────────
// saveSvgToDownloads
// ──────────────────────────────────────────

describe("saveSvgToDownloads", () => {
  // Use a unique filename to avoid conflicts with real user files
  const TEST_FILENAME = `_FIRE-test-${Date.now()}.svg`;
  const cleanupPaths: string[] = [];

  afterEach(async () => {
    for (const p of cleanupPaths) {
      try {
        await rm(p, { force: true });
      } catch {
        // ignore cleanup errors
      }
    }
    cleanupPaths.length = 0;
  });

  it("writes SVG content to ~/Downloads and returns the path", async () => {
    const filePath = await saveSvgToDownloads(SAMPLE_SVG, TEST_FILENAME);
    cleanupPaths.push(filePath);

    const content = await readFile(filePath, "utf-8");
    expect(content).toBe(SAMPLE_SVG);
  });

  it("returns a path inside the Downloads directory", async () => {
    const filePath = await saveSvgToDownloads(SAMPLE_SVG, TEST_FILENAME);
    cleanupPaths.push(filePath);

    const expectedDir = join(homedir(), "Downloads");
    expect(filePath).toContain(expectedDir);
  });

  it("returns a path ending with the specified filename", async () => {
    const filePath = await saveSvgToDownloads(SAMPLE_SVG, TEST_FILENAME);
    cleanupPaths.push(filePath);

    expect(filePath.endsWith(TEST_FILENAME)).toBe(true);
  });

  it("overwrites an existing file with the same name", async () => {
    const uniqueName = `_FIRE-overwrite-${Date.now()}.svg`;
    const firstContent = "<svg>first</svg>";
    const secondContent = "<svg>second</svg>";

    const path1 = await saveSvgToDownloads(firstContent, uniqueName);
    cleanupPaths.push(path1);

    const path2 = await saveSvgToDownloads(secondContent, uniqueName);
    expect(path2).toBe(path1);

    const content = await readFile(path2, "utf-8");
    expect(content).toBe(secondContent);
  });

  it("sanitises filenames with path separators to prevent directory traversal", async () => {
    const filePath = await saveSvgToDownloads(SAMPLE_SVG, `../../${TEST_FILENAME}`);
    cleanupPaths.push(filePath);

    const downloadsDir = join(homedir(), "Downloads");
    expect(filePath).toContain(downloadsDir);
    expect(filePath).not.toContain("../../");
  });
});
