import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cacheFileName, prepareEmoteFile } from "../../src/io/prepare";
import type { Emote } from "../../src/types";
import { fetchCall } from "../helpers";

function cacheDir(): string {
  return mkdtempSync(join(tmpdir(), "emotecast-cache-"));
}

function gifBuffer(height: number): Buffer {
  const buf = Buffer.alloc(64);
  buf.write("GIF89a", 0, "latin1");
  buf.writeUInt16LE(height, 6);
  buf.writeUInt16LE(height, 8);
  return buf;
}

function emote(overrides: Partial<Emote> = {}): Emote {
  return {
    key: "7tv:ABC",
    name: "catJAM",
    source: "7tv",
    animated: true,
    nsfw: false,
    preview: "https://cdn.example/2x.gif",
    variants: [
      { url: "https://cdn.example/1x.gif", height: 32, mime: "image/gif" },
      { url: "https://cdn.example/4x.gif", height: 128, mime: "image/gif" },
    ],
    ...overrides,
  };
}

function serves(buffer: Buffer) {
  return vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: async () => buffer.buffer.slice(0, buffer.length),
  });
}

function slowTool(): string {
  const dir = mkdtempSync(join(tmpdir(), "emotecast-bin-"));
  const path = join(dir, "slowtool");
  writeFileSync(
    path,
    '#!/bin/sh\nfor out; do :; done\nsleep 0.3\nprintf transcoded > "$out"\n',
  );
  chmodSync(path, 0o755);
  return path;
}

function fakeTool(): string {
  const dir = mkdtempSync(join(tmpdir(), "emotecast-bin-"));
  const path = join(dir, "faketool");
  writeFileSync(path, '#!/bin/sh\nfor out; do :; done\nprintf transcoded > "$out"\n');
  chmodSync(path, 0o755);
  return path;
}

afterEach(() => vi.unstubAllGlobals());

describe("cacheFileName", () => {
  it("encodes source, id and height, and picks the format from animation", () => {
    expect(cacheFileName(emote(), 32)).toBe("7tv-ABC-32.gif");
    expect(cacheFileName(emote({ animated: false }), 128)).toBe(
      "7tv-ABC-128.png",
    );
  });

  it("separates the two sizes of the same emote", () => {
    expect(cacheFileName(emote(), 32)).not.toBe(cacheFileName(emote(), 128));
  });
});

describe("prepareEmoteFile", () => {
  it("writes the download untouched when it already matches", async () => {
    vi.stubGlobal("fetch", serves(gifBuffer(32)));
    const dir = cacheDir();

    const file = await prepareEmoteFile(emote(), 32, { cacheDir: dir });
    expect(file).toBe(join(dir, "7tv-ABC-32.gif"));
    expect(readFileSync(file).subarray(0, 3).toString()).toBe("GIF");
  });

  it("does not download again once the file is cached", async () => {
    const fetchMock = serves(gifBuffer(32));
    vi.stubGlobal("fetch", fetchMock);
    const dir = cacheDir();

    await prepareEmoteFile(emote(), 32, { cacheDir: dir });
    await prepareEmoteFile(emote(), 32, { cacheDir: dir });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("picks the variant closest to the requested height", async () => {
    const fetchMock = serves(gifBuffer(128));
    vi.stubGlobal("fetch", fetchMock);

    await prepareEmoteFile(emote(), 128, { cacheDir: cacheDir() });
    expect(fetchCall(fetchMock, 0).url).toBe("https://cdn.example/4x.gif");
  });

  it("runs the tool when the download is the wrong height", async () => {
    vi.stubGlobal("fetch", serves(gifBuffer(108)));
    const dir = cacheDir();

    const file = await prepareEmoteFile(emote(), 128, {
      cacheDir: dir,
      tools: { ffmpeg: fakeTool() },
    });
    expect(readFileSync(file).toString()).toBe("transcoded");
  });

  it("removes the temporary source once the tool has run", async () => {
    vi.stubGlobal("fetch", serves(gifBuffer(108)));
    const dir = cacheDir();

    await prepareEmoteFile(emote(), 128, {
      cacheDir: dir,
      tools: { ffmpeg: fakeTool() },
    });
    expect(readdirSync(dir).filter((f) => f.startsWith(".src-"))).toEqual([]);
  });

  it("removes the temporary source even when the tool fails", async () => {
    vi.stubGlobal("fetch", serves(gifBuffer(108)));
    const dir = cacheDir();
    const failing = join(mkdtempSync(join(tmpdir(), "emotecast-bin-")), "fail");
    writeFileSync(failing, "#!/bin/sh\nexit 1\n");
    chmodSync(failing, 0o755);

    await expect(
      prepareEmoteFile(emote(), 128, {
        cacheDir: dir,
        tools: { ffmpeg: failing },
      }),
    ).rejects.toThrow();
    expect(readdirSync(dir).filter((f) => f.startsWith(".src-"))).toEqual([]);
  });

  it("creates the cache directory when it does not exist", async () => {
    vi.stubGlobal("fetch", serves(gifBuffer(32)));
    const dir = join(cacheDir(), "nested", "emotes");

    await prepareEmoteFile(emote(), 32, { cacheDir: dir });
    expect(existsSync(dir)).toBe(true);
  });

  it("surfaces a failed download", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(
      prepareEmoteFile(emote(), 32, { cacheDir: cacheDir() }),
    ).rejects.toThrow("404");
  });

  it("leaves no output behind when the tool fails, so a retry can work", async () => {
    vi.stubGlobal("fetch", serves(gifBuffer(108)));
    const dir = cacheDir();
    const failing = join(mkdtempSync(join(tmpdir(), "emotecast-bin-")), "fail");
    writeFileSync(
      failing,
      '#!/bin/sh\nfor out; do :; done\nprintf truncated > "$out"\nexit 1\n',
    );
    chmodSync(failing, 0o755);

    await expect(
      prepareEmoteFile(emote(), 128, {
        cacheDir: dir,
        tools: { ffmpeg: failing },
      }),
    ).rejects.toThrow();

    expect(existsSync(join(dir, "7tv-ABC-128.gif"))).toBe(false);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("keeps concurrent preparations from clobbering each other", async () => {
    vi.stubGlobal("fetch", serves(gifBuffer(108)));
    const dir = cacheDir();
    const tools = { ffmpeg: slowTool() };

    const files = await Promise.all([
      prepareEmoteFile(emote({ key: "7tv:AAA" }), 128, { cacheDir: dir, tools }),
      prepareEmoteFile(emote({ key: "7tv:BBB" }), 128, { cacheDir: dir, tools }),
      prepareEmoteFile(emote({ key: "7tv:CCC" }), 32, { cacheDir: dir, tools }),
    ]);

    for (const file of files) {
      expect(readFileSync(file).toString()).toBe("transcoded");
    }
    expect(readdirSync(dir).filter((f) => f.startsWith("."))).toEqual([]);
  });

  it("fails clearly when the emote exposes no variant", async () => {
    await expect(
      prepareEmoteFile(emote({ variants: [] }), 32, { cacheDir: cacheDir() }),
    ).rejects.toThrow("No image available");
  });
});
