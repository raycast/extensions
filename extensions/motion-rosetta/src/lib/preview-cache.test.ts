import { expect, it, vi } from "vitest";
import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { withCacheLock } from "./cache-lock.ts";
import { PreviewCache, MAX_BYTES } from "./preview-cache.ts";
import { fromDuration } from "./model.ts";
import { encodeRetinaPreview } from "./retina-preview.ts";
import type { PreviewSpec } from "./preview.ts";

// Oversized synthetic frames exercise storage policy independently of encoding.
vi.mock("./retina-preview.ts", () => ({
  encodeRetinaPreview: vi.fn(() => new Uint8Array(2 * 1024 * 1024)),
}));
const spec: PreviewSpec = {
  easing: fromDuration(0.5, 0.6),
  duration: 0.5,
  component: "Sheet",
  appearance: "dark",
};

it("admits simultaneous requests under the byte cap while protecting the displayed GIF", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rosetta-live-cache-"));
  try {
    const cache = new PreviewCache(directory);
    const first = await cache.get(spec);
    cache.setActive(first.path);
    await utimes(first.path, new Date(0), new Date(0));
    await writeFile(join(directory, "user-file.txt"), "untouched");
    const requests = Array.from({ length: 14 }, (_, i) =>
      cache.get({ ...spec, duration: i + 1 }),
    );
    await Promise.all(requests);
    const gifs = (await readdir(directory)).filter((name) =>
      name.endsWith(".gif"),
    );
    const sizes = await Promise.all(
      gifs.map((name) => stat(join(directory, name))),
    );
    expect(
      sizes.reduce((total, info) => total + info.size, 0),
    ).toBeLessThanOrEqual(MAX_BYTES);
    expect(gifs.length).toBeLessThanOrEqual(200);
    expect((await stat(first.path)).size).toBe(2 * 1024 * 1024);
    expect(await readFile(join(directory, "user-file.txt"), "utf8")).toBe(
      "untouched",
    );
    expect(
      (await readdir(directory)).some((name) => name.endsWith(".tmp")),
    ).toBe(false);
    expect((await cache.get(spec)).cached).toBe(true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("deduplicates requests and recovers the queue after an encoding failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rosetta-cache-recovery-"));
  try {
    const cache = new PreviewCache(directory);
    vi.mocked(encodeRetinaPreview).mockImplementationOnce(() => {
      throw new Error("encoder failed");
    });
    await expect(cache.get(spec)).rejects.toThrow("encoder failed");
    const first = cache.get(spec);
    expect(cache.get({ ...spec })).toBe(first);
    const result = await first;
    expect((await stat(result.path)).size).toBe(2 * 1024 * 1024);
    expect((await cache.get(spec)).cached).toBe(true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("coordinates independent caches and rescans actual disk usage", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rosetta-multi-cache-"));
  try {
    vi.mocked(encodeRetinaPreview).mockImplementation(
      () => new Uint8Array(1024),
    );
    for (let i = 0; i < 199; i++)
      await writeFile(
        join(directory, `${i.toString(16).padStart(64, "0")}.gif`),
        new Uint8Array(1024),
      );
    const a = new PreviewCache(directory),
      b = new PreviewCache(directory);
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        (i % 2 ? a : b).get({ ...spec, duration: i + 1 }),
      ),
    );
    const files = (await readdir(directory)).filter((name) =>
      name.endsWith(".gif"),
    );
    expect(files.length).toBeLessThanOrEqual(200);
    expect((await readdir(directory)).includes(".admission-lock")).toBe(false);
  } finally {
    vi.mocked(encodeRetinaPreview).mockImplementation(
      () => new Uint8Array(2 * 1024 * 1024),
    );
    await rm(directory, { recursive: true, force: true });
  }
});

it("does not steal another process's lock and retries after it is released", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rosetta-busy-cache-"));
  try {
    let release!: () => void;
    let entered!: () => void;
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const holding = withCacheLock(directory, async () => {
      entered();
      await gate;
    });
    await ready;
    try {
      await expect(
        withCacheLock(directory, async () => {}, 60),
      ).rejects.toThrow("cache is busy");
      expect((await readdir(join(directory, ".admission-v2"))).length).toBe(1);
    } finally {
      release();
      await holding;
    }
    const cache = new PreviewCache(directory);
    expect((await cache.get(spec)).cached).toBe(false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 10000);
