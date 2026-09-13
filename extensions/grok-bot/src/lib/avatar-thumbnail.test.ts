import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CapturedAvatar,
  avatarFilePath,
  createAvatarCaptureSink,
  materializeAvatarThumbnail,
} from "./avatar-thumbnail";
import { parseAgentId } from "./types";

const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const PNG_DATA_URL = `data:image/png;base64,${PNG_BASE64}`;
const PNG_HASH = createHash("sha256").update(Buffer.from(PNG_BASE64, "base64")).digest("hex").slice(0, 16);

function captureDataUrl(directory: string, dataUrl: string): CapturedAvatar | null {
  const sink = createAvatarCaptureSink(directory);
  sink.write(dataUrl);
  return sink.end();
}

describe("createAvatarCaptureSink", () => {
  let supportPath = "";

  afterEach(() => {
    if (supportPath.length > 0) {
      rmSync(supportPath, { recursive: true, force: true });
      supportPath = "";
    }
  });

  it("decodes a 1x1 PNG data URL onto disk", () => {
    supportPath = mkdtempSync(join(tmpdir(), "grok-bot-avatar-"));
    const captured = captureDataUrl(supportPath, PNG_DATA_URL);
    expect(captured).not.toBeNull();
    if (!captured) {
      return;
    }
    expect(captured.hash).toBe(PNG_HASH);
    expect(existsSync(captured.sourcePath)).toBe(true);
    expect(statSync(captured.sourcePath).size).toBe(Buffer.from(PNG_BASE64, "base64").length);
  });

  it("decodes the same PNG when the data URL arrives one character at a time", () => {
    supportPath = mkdtempSync(join(tmpdir(), "grok-bot-avatar-"));
    const sink = createAvatarCaptureSink(supportPath);
    for (const character of PNG_DATA_URL) {
      sink.write(character);
    }
    const captured = sink.end();
    expect(captured?.hash).toBe(PNG_HASH);
  });

  it("rejects webp and garbage", () => {
    supportPath = mkdtempSync(join(tmpdir(), "grok-bot-avatar-"));
    expect(captureDataUrl(supportPath, "data:image/webp;base64,abc")).toBeNull();
    expect(captureDataUrl(supportPath, "not-a-data-url")).toBeNull();
    expect(captureDataUrl(supportPath, "data:image/png;base64,")).toBeNull();
  });
});

describe("materializeAvatarThumbnail", () => {
  let supportPath = "";

  afterEach(() => {
    if (supportPath.length > 0) {
      rmSync(supportPath, { recursive: true, force: true });
      supportPath = "";
    }
    vi.restoreAllMocks();
  });

  it("writes a thumbnail and reuses the cache on the second call", async () => {
    supportPath = mkdtempSync(join(tmpdir(), "grok-bot-avatar-"));
    const agentId = parseAgentId("a1");
    if (!agentId.ok) {
      throw new Error("invalid test id");
    }
    const resize = vi.fn(async ({ destPath }: { sourcePath: string; destPath: string }) => {
      writeFileSync(destPath, Buffer.from("jpeg-bytes"));
    });

    const firstCapture = captureDataUrl(supportPath, PNG_DATA_URL);
    expect(firstCapture).not.toBeNull();
    if (!firstCapture) {
      return;
    }
    const first = await materializeAvatarThumbnail({
      supportPath,
      agentId: agentId.value,
      sourcePath: firstCapture.sourcePath,
      hash: firstCapture.hash,
      resize,
    });
    expect(first).toBe(PNG_HASH);
    expect(resize).toHaveBeenCalledTimes(1);
    expect(existsSync(firstCapture.sourcePath)).toBe(false);

    const dest = avatarFilePath({ supportPath, agentId: agentId.value, hash: PNG_HASH });
    expect(existsSync(dest)).toBe(true);

    const secondCapture = captureDataUrl(supportPath, PNG_DATA_URL);
    expect(secondCapture).not.toBeNull();
    if (!secondCapture) {
      return;
    }
    const second = await materializeAvatarThumbnail({
      supportPath,
      agentId: agentId.value,
      sourcePath: secondCapture.sourcePath,
      hash: secondCapture.hash,
      resize,
    });
    expect(second).toBe(PNG_HASH);
    expect(resize).toHaveBeenCalledTimes(1);
    expect(existsSync(secondCapture.sourcePath)).toBe(false);
  });

  it("deletes older thumbnails for the same agent when a new hash is written", async () => {
    supportPath = mkdtempSync(join(tmpdir(), "grok-bot-avatar-"));
    const agentId = parseAgentId("a1");
    if (!agentId.ok) {
      throw new Error("invalid test id");
    }
    const oldHash = "1111111111111111";
    const oldPath = avatarFilePath({ supportPath, agentId: agentId.value, hash: oldHash });
    mkdirSync(dirname(oldPath), { recursive: true });
    writeFileSync(oldPath, Buffer.from("old"));

    const captured = captureDataUrl(supportPath, PNG_DATA_URL);
    expect(captured).not.toBeNull();
    if (!captured) {
      return;
    }
    await materializeAvatarThumbnail({
      supportPath,
      agentId: agentId.value,
      sourcePath: captured.sourcePath,
      hash: captured.hash,
      resize: async ({ destPath }) => {
        writeFileSync(destPath, Buffer.from("new-jpeg"));
      },
    });

    expect(existsSync(oldPath)).toBe(false);
    expect(existsSync(avatarFilePath({ supportPath, agentId: agentId.value, hash: PNG_HASH }))).toBe(true);
  });

  it("does not write outside the avatars directory for unsafe agent ids", async () => {
    supportPath = mkdtempSync(join(tmpdir(), "grok-bot-avatar-"));
    const parsed = parseAgentId("../../../escape");
    if (!parsed.ok) {
      throw new Error("invalid test id");
    }

    const captured = captureDataUrl(supportPath, PNG_DATA_URL);
    expect(captured).not.toBeNull();
    if (!captured) {
      return;
    }
    const hash = await materializeAvatarThumbnail({
      supportPath,
      agentId: parsed.value,
      sourcePath: captured.sourcePath,
      hash: captured.hash,
      resize: async ({ destPath }) => {
        writeFileSync(destPath, Buffer.from("jpeg-bytes"));
      },
    });

    expect(hash).not.toBeNull();
    if (!hash) {
      return;
    }
    const avatarsRoot = resolve(join(supportPath, "avatars"));
    const dest = resolve(avatarFilePath({ supportPath, agentId: parsed.value, hash }));
    expect(dest.startsWith(`${avatarsRoot}${sep}`)).toBe(true);
    expect(existsSync(dest)).toBe(true);
  });

  it.runIf(process.platform === "darwin")("resizes with sips on macOS", async () => {
    supportPath = mkdtempSync(join(tmpdir(), "grok-bot-avatar-"));
    const agentId = parseAgentId("a1");
    if (!agentId.ok) {
      throw new Error("invalid test id");
    }

    const captured = captureDataUrl(supportPath, PNG_DATA_URL);
    expect(captured).not.toBeNull();
    if (!captured) {
      return;
    }
    const hash = await materializeAvatarThumbnail({
      supportPath,
      agentId: agentId.value,
      sourcePath: captured.sourcePath,
      hash: captured.hash,
    });

    expect(hash).not.toBeNull();
    if (!hash) {
      return;
    }
    const dest = avatarFilePath({ supportPath, agentId: agentId.value, hash });
    expect(existsSync(dest)).toBe(true);
    expect(statSync(dest).size).toBeLessThan(20_000);
  });
});
