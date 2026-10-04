import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareEmoteFile } from "../../src/io/prepare";
import { ToolMissingError } from "../../src/io/tools";
import type { Emote } from "../../src/types";

vi.mock("../../src/io/tools", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/io/tools")>()),
  resolveTool: () => undefined,
}));

const webpEmote: Emote = {
  key: "ffz:1",
  name: "Catjam",
  source: "ffz",
  animated: true,
  nsfw: false,
  preview: "https://cdn.example/2.webp",
  variants: [
    { url: "https://cdn.example/4.webp", height: 112, mime: "image/webp" },
  ],
};

const gifEmote: Emote = {
  ...webpEmote,
  key: "bttv:1",
  source: "bttv",
  variants: [{ url: "https://cdn.example/3x", height: 112, mime: "image/gif" }],
};

function serves(format: "webp" | "gif") {
  const buf = Buffer.alloc(64);
  if (format === "webp") {
    buf.write("RIFF", 0, "latin1");
    buf.write("WEBP", 8, "latin1");
    buf.write("VP8X", 12, "latin1");
    buf.writeUIntLE(111, 24, 3);
    buf.writeUIntLE(111, 27, 3);
  } else {
    buf.write("GIF89a", 0, "latin1");
    buf.writeUInt16LE(112, 6);
    buf.writeUInt16LE(112, 8);
  }
  return vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: async () => buf.buffer.slice(0, buf.length),
  });
}

const cacheDir = () => mkdtempSync(join(tmpdir(), "emotecast-missing-"));

function preparationError(emote: Emote): Promise<unknown> {
  return prepareEmoteFile(emote, 128, { cacheDir: cacheDir() }).catch(
    (thrown: unknown) => thrown,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("prepareEmoteFile without the required tool", () => {
  it("asks for ImageMagick when the emote is an animated WebP", async () => {
    vi.stubGlobal("fetch", serves("webp"));
    const error = await preparationError(webpEmote);
    expect(error).toBeInstanceOf(ToolMissingError);
    expect((error as ToolMissingError).tool).toBe("magick");
  });

  it("asks for ffmpeg when the emote is a GIF of the wrong height", async () => {
    vi.stubGlobal("fetch", serves("gif"));
    const error = await preparationError(gifEmote);
    expect(error).toBeInstanceOf(ToolMissingError);
    expect((error as ToolMissingError).tool).toBe("ffmpeg");
  });
});
