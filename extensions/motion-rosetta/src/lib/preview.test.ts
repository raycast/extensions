import { describe, expect, it } from "vitest";
import {
  mkdtemp,
  readdir,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PreviewCache, previewKey, MAX_BYTES } from "./preview-cache.ts";
import { COMPONENTS, type PreviewSpec } from "./preview.ts";
import { encodeRetinaPreview } from "./retina-preview.ts";
import { fromDuration } from "./model.ts";

const spec: PreviewSpec = {
  easing: fromDuration(0.5, 0.6),
  duration: 1.529495,
  component: "Sheet",
  appearance: "dark",
};
describe("animated previews", () => {
  it("keys all pixel-affecting inputs, including theme and duration", () => {
    const keys = [
      spec,
      { ...spec, appearance: "light" as const },
      { ...spec, duration: 2 },
      { ...spec, component: "Toggle" as const },
      { ...spec, easing: fromDuration(0.5, 0.3) },
    ].map(previewKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("encodes every component as a looping GIF with final dimensions", () => {
    for (const component of COMPONENTS) {
      const bytes = encodeRetinaPreview(
        { ...spec, component },
        join(process.cwd(), "assets"),
      );
      const buffer = Buffer.from(bytes);
      expect(buffer.subarray(0, 6).toString()).toBe("GIF89a");
      expect(buffer.readUInt16LE(6)).toBe(680);
      expect(buffer.readUInt16LE(8)).toBe(352);
      expect(buffer.includes(Buffer.from("NETSCAPE2.0"))).toBe(true);
      expect(bytes.at(-1)).toBe(0x3b);
    }
  });
  it("reuses identical curves across calls and new command instances", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rosetta-cache-test-"));
    try {
      const cache = new PreviewCache(directory);
      const first = await cache.get(spec);
      expect(first.cached).toBe(false);
      const { readFile } = await import("node:fs/promises");
      const file = await readFile(first.path);
      expect([file.readUInt16LE(6), file.readUInt16LE(8)]).toEqual([680, 352]);
      expect((await cache.get({ ...spec })).cached).toBe(true);
      expect((await new PreviewCache(directory).get(spec)).cached).toBe(true);
      expect(
        (await readdir(directory)).filter((name) => name.endsWith(".gif")),
      ).toEqual([`${previewKey(spec)}.gif`]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("evicts least recently used at startup and on admission without exceeding the cap", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rosetta-lru-test-"));
    try {
      for (let i = 0; i < 201; i++) {
        const path = join(directory, `${i.toString(16).padStart(64, "0")}.gif`);
        await writeFile(path, "test");
        await utimes(path, new Date(i * 1000), new Date(i * 1000));
      }
      const cache = new PreviewCache(directory);
      await cache.get(spec);
      expect(
        (await readdir(directory)).filter((name) => name.endsWith(".gif"))
          .length,
      ).toBe(200);
      await expect(
        stat(join(directory, `${"0".repeat(64)}.gif`)),
      ).rejects.toThrow();
      const next = await cache.get({ ...spec, component: "Toggle" });
      expect(next.cached).toBe(false);
      expect(
        (await readdir(directory)).filter((name) => name.endsWith(".gif"))
          .length,
      ).toBe(200);
      await expect(
        stat(join(directory, `${"2".padStart(64, "0")}.gif`)),
      ).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("also evicts by bytes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rosetta-byte-test-"));
    try {
      const path = join(directory, `${"a".repeat(64)}.gif`);
      await writeFile(path, new Uint8Array(MAX_BYTES + 1));
      await new PreviewCache(directory).get(spec);
      await expect(stat(path)).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
