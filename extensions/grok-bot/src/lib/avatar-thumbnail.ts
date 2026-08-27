import { createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { SkippedFieldSink } from "./strip-json-string-field";
import { AgentId } from "./types";

const AVATAR_SIZE_PX = 128;

const HEADER_MAX = 80;
const BASE64_DECODE_SLICE = 65_536;
const DECODE_FLUSH_AT = 64 * 1024;
const HEADER_RE = /^data:image\/(png|jpe?g|gif);base64,$/i;

const execFileAsync = promisify(execFile);

export type CapturedAvatar = {
  sourcePath: string;
  hash: string;
};

function safeAgentId(agentId: AgentId): string {
  return agentId.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
}

function avatarsDir(supportPath: string): string {
  return join(supportPath, "avatars");
}

function isInsideAvatarsDir(supportPath: string, filePath: string): boolean {
  const dir = resolve(avatarsDir(supportPath));
  const resolved = resolve(filePath);
  return resolved === dir || resolved.startsWith(`${dir}/`);
}

export function avatarFilePath(input: { supportPath: string; agentId: AgentId; hash: string }): string {
  const safeId = safeAgentId(input.agentId);
  return join(avatarsDir(input.supportPath), `${safeId}-${input.hash}.jpg`);
}

function formatFromHeaderType(type: string): "png" | "jpeg" | "gif" | null {
  const normalized = type.toLowerCase();
  if (normalized === "png") {
    return "png";
  }
  if (normalized === "jpg" || normalized === "jpeg") {
    return "jpeg";
  }
  if (normalized === "gif") {
    return "gif";
  }
  return null;
}

function formatExtension(format: "png" | "jpeg" | "gif"): string {
  switch (format) {
    case "png":
      return ".png";
    case "jpeg":
      return ".jpg";
    case "gif":
      return ".gif";
    default: {
      const _exhaustive: never = format;
      return _exhaustive;
    }
  }
}

function unlinkQuiet(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    return;
  }
}

function gcOtherAvatars(input: { supportPath: string; agentId: AgentId; keepPath: string }): void {
  const dir = avatarsDir(input.supportPath);
  if (!existsSync(dir)) {
    return;
  }
  const prefix = `${safeAgentId(input.agentId)}-`;
  const keep = resolve(input.keepPath);
  for (const name of readdirSync(dir)) {
    const filePath = join(dir, name);
    if (!isInsideAvatarsDir(input.supportPath, filePath)) {
      continue;
    }
    if (!name.startsWith(prefix) || !name.endsWith(".jpg")) {
      continue;
    }
    if (resolve(filePath) === keep) {
      continue;
    }
    unlinkQuiet(filePath);
  }
}

async function defaultResize(input: { sourcePath: string; destPath: string }): Promise<void> {
  const { stdout } = await execFileAsync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", input.sourcePath], {
    timeout: 15_000,
  });
  const widthMatch = /pixelWidth:\s*(\d+)/.exec(stdout);
  const heightMatch = /pixelHeight:\s*(\d+)/.exec(stdout);
  const width = widthMatch ? Number.parseInt(widthMatch[1] ?? "", 10) : Number.NaN;
  const height = heightMatch ? Number.parseInt(heightMatch[1] ?? "", 10) : Number.NaN;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("invalid image dimensions");
  }
  const side = Math.min(width, height);
  const croppedPath = `${input.sourcePath}.cropped`;
  await execFileAsync("/usr/bin/sips", ["-c", String(side), String(side), input.sourcePath, "--out", croppedPath], {
    timeout: 15_000,
  });
  try {
    await execFileAsync(
      "/usr/bin/sips",
      [
        "-z",
        String(AVATAR_SIZE_PX),
        String(AVATAR_SIZE_PX),
        "-s",
        "format",
        "jpeg",
        "-s",
        "formatOptions",
        "70",
        croppedPath,
        "--out",
        input.destPath,
      ],
      { timeout: 15_000 },
    );
  } finally {
    unlinkQuiet(croppedPath);
  }
}

function fileHasContent(path: string): boolean {
  try {
    return statSync(path).size > 0;
  } catch {
    return false;
  }
}

export function createAvatarCaptureSink(directory: string): SkippedFieldSink<CapturedAvatar> {
  mkdirSync(directory, { recursive: true });
  let sourcePath = join(directory, `.cap-${randomBytes(8).toString("hex")}`);
  let header = "";
  let headerDone = false;
  let format: "png" | "jpeg" | "gif" | null = null;
  let leftover = "";
  let failed = false;
  let ended = false;
  let opened = false;
  let bytes = 0;
  const hash = createHash("sha256");
  const pending: Buffer[] = [];
  let pendingSize = 0;

  function fail(): void {
    failed = true;
    leftover = "";
    header = "";
    pending.length = 0;
    pendingSize = 0;
  }

  function flush(): void {
    if (pendingSize === 0) {
      return;
    }
    const buf = Buffer.concat(pending, pendingSize);
    pending.length = 0;
    pendingSize = 0;
    hash.update(buf);
    bytes += buf.length;
    if (!opened) {
      writeFileSync(sourcePath, buf);
      opened = true;
    } else {
      appendFileSync(sourcePath, buf);
    }
  }

  function pushDecoded(buf: Buffer): void {
    if (buf.length === 0) {
      return;
    }
    pending.push(buf);
    pendingSize += buf.length;
    if (pendingSize >= DECODE_FLUSH_AT) {
      flush();
    }
  }

  function consumeBase64(text: string): void {
    let offset = 0;
    if (leftover.length > 0) {
      const need = 4 - leftover.length;
      if (text.length < need) {
        leftover += text;
        return;
      }
      pushDecoded(Buffer.from(leftover + text.slice(0, need), "base64"));
      leftover = "";
      offset = need;
    }
    const remaining = text.length - offset;
    const aligned = remaining - (remaining % 4);
    const end = offset + aligned;
    let index = offset;
    while (index < end) {
      const next = Math.min(index + BASE64_DECODE_SLICE, end);
      pushDecoded(Buffer.from(text.slice(index, next), "base64"));
      index = next;
    }
    leftover = text.slice(end);
  }

  function acceptPrefix(prefix: string): boolean {
    const match = HEADER_RE.exec(prefix);
    const type = match?.[1];
    if (type === undefined) {
      return false;
    }
    const parsed = formatFromHeaderType(type);
    if (parsed === null) {
      return false;
    }
    format = parsed;
    headerDone = true;
    sourcePath = `${sourcePath}${formatExtension(parsed)}`;
    return true;
  }

  return {
    write(unescaped: string): void {
      if (failed || ended || unescaped.length === 0) {
        return;
      }
      if (!headerDone) {
        const comma = unescaped.indexOf(",");
        if (comma === -1) {
          if (header.length + unescaped.length > HEADER_MAX) {
            fail();
            return;
          }
          header += unescaped;
          return;
        }
        if (header.length + comma + 1 > HEADER_MAX) {
          fail();
          return;
        }
        const prefix = header + unescaped.slice(0, comma + 1);
        header = "";
        if (!acceptPrefix(prefix)) {
          fail();
          return;
        }
        consumeBase64(unescaped.slice(comma + 1));
        return;
      }
      consumeBase64(unescaped);
    },
    abort(): void {
      fail();
    },
    end(): CapturedAvatar | null {
      if (ended) {
        return null;
      }
      ended = true;
      if (failed || !headerDone || format === null) {
        if (opened) {
          unlinkQuiet(sourcePath);
        }
        return null;
      }
      if (leftover.length > 0) {
        pushDecoded(Buffer.from(leftover, "base64"));
        leftover = "";
      }
      flush();
      if (bytes === 0) {
        if (opened) {
          unlinkQuiet(sourcePath);
        }
        return null;
      }
      return {
        sourcePath,
        hash: hash.digest("hex").slice(0, 16),
      };
    },
  };
}

export async function materializeAvatarThumbnail(input: {
  supportPath: string;
  agentId: AgentId;
  sourcePath: string;
  hash: string;
  resize?: (input: { sourcePath: string; destPath: string }) => Promise<void>;
}): Promise<string | null> {
  const dest = avatarFilePath({ supportPath: input.supportPath, agentId: input.agentId, hash: input.hash });
  if (!isInsideAvatarsDir(input.supportPath, dest)) {
    unlinkQuiet(input.sourcePath);
    return null;
  }

  try {
    if (existsSync(dest) && fileHasContent(dest)) {
      gcOtherAvatars({ supportPath: input.supportPath, agentId: input.agentId, keepPath: dest });
      return input.hash;
    }

    mkdirSync(avatarsDir(input.supportPath), { recursive: true });
    const resize = input.resize ?? defaultResize;
    await resize({ sourcePath: input.sourcePath, destPath: dest });

    if (!fileHasContent(dest)) {
      unlinkQuiet(dest);
      return null;
    }

    gcOtherAvatars({ supportPath: input.supportPath, agentId: input.agentId, keepPath: dest });
    return input.hash;
  } catch {
    unlinkQuiet(dest);
    return null;
  } finally {
    unlinkQuiet(input.sourcePath);
  }
}
