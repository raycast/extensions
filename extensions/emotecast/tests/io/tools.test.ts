import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  INSTALL_COMMAND,
  ToolMissingError,
  resolveTool,
} from "../../src/io/tools";

function executable(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), "emotecast-tools-"));
  const path = join(dir, name);
  writeFileSync(path, "#!/bin/sh\nexit 0\n");
  chmodSync(path, 0o755);
  return path;
}

describe("resolveTool", () => {
  it("prefers the configured path over the default locations", () => {
    const custom = executable("ffmpeg");
    expect(resolveTool("ffmpeg", custom)).toBe(custom);
  });

  it("ignores a blank preference and falls back to the defaults", () => {
    const resolved = resolveTool("ffmpeg", "   ");
    expect(resolved === undefined || resolved.endsWith("ffmpeg")).toBe(true);
  });

  it("skips a configured path that does not exist", () => {
    const resolved = resolveTool("ffmpeg", "/nonexistent/ffmpeg");
    expect(resolved).not.toBe("/nonexistent/ffmpeg");
  });

  it("skips a path that exists but is not executable", () => {
    const dir = mkdtempSync(join(tmpdir(), "emotecast-tools-"));
    const path = join(dir, "ffmpeg");
    writeFileSync(path, "not executable");
    chmodSync(path, 0o644);
    expect(resolveTool("ffmpeg", path)).not.toBe(path);
  });

  it("looks up absolute paths, as Raycast does not inherit the shell PATH", () => {
    const magick = executable("magick");
    expect(resolveTool("magick", magick)).toBe(magick);
  });
});

describe("ToolMissingError", () => {
  it("names the tool so the UI can explain what to install", () => {
    const error = new ToolMissingError("magick");
    expect(error.tool).toBe("magick");
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain("magick");
  });

  it("has an install command for every tool", () => {
    expect(INSTALL_COMMAND.ffmpeg).toBe("brew install ffmpeg");
    expect(INSTALL_COMMAND.magick).toBe("brew install imagemagick");
  });
});
