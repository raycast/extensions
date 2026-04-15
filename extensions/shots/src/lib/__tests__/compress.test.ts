import { randomFillSync } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { compressToTarget } from "../compress";

async function createNoisyPng(path: string, width: number, height: number): Promise<void> {
  const raw = Buffer.alloc(width * height * 3);
  randomFillSync(raw);
  await sharp(raw, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(path);
}

describe("compressToTarget", () => {
  it("returns a result under max bytes when feasible", async () => {
    const dir = await mkdtemp(join(tmpdir(), "compress-test-"));
    const inputPath = join(dir, "input.png");

    try {
      await createNoisyPng(inputPath, 120, 80);
      const result = await compressToTarget(inputPath, 120_000);
      expect(result.bytes).toBeLessThanOrEqual(120_000);
      expect(result.quality).toBeGreaterThanOrEqual(30);
      expect(result.quality).toBeLessThanOrEqual(95);
      expect(["webp", "jpeg"]).toContain(result.format);
      expect(["webp", "jpg"]).toContain(result.extension);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("falls back to minimum quality when target is too strict", async () => {
    const dir = await mkdtemp(join(tmpdir(), "compress-test-"));
    const inputPath = join(dir, "input.png");

    try {
      await createNoisyPng(inputPath, 512, 512);
      const result = await compressToTarget(inputPath, 100);
      expect(result.quality).toBe(30);
      expect(result.bytes).toBeGreaterThan(100);
      expect(["image/webp", "image/jpeg"]).toContain(result.contentType);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
