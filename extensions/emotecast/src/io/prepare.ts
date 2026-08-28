import { execFile } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { readImageInfo } from "../core/image";
import { needsTranscode, planTranscode, targetFormat } from "../core/transcode";
import { pickVariant } from "../core/variant";
import type { Emote } from "../types";
import { type ToolId, ToolMissingError, resolveTool } from "./tools";

const run = promisify(execFile);

const TRANSCODE_TIMEOUT_MS = 30_000;

export type ToolPaths = Partial<Record<ToolId, string>>;

export type PrepareOptions = {
  cacheDir: string;
  tools?: ToolPaths;
};

export function cacheFileName(emote: Emote, targetHeight: number): string {
  const slug = emote.key.replace(":", "-");
  return `${slug}-${targetHeight}.${targetFormat(emote.animated)}`;
}

export async function prepareEmoteFile(
  emote: Emote,
  targetHeight: number,
  { cacheDir, tools = {} }: PrepareOptions,
): Promise<string> {
  mkdirSync(cacheDir, { recursive: true });

  const output = join(cacheDir, cacheFileName(emote, targetHeight));
  if (existsSync(output)) return output;

  const variant = pickVariant(emote.variants, targetHeight);
  if (!variant) throw new Error(`No image available for ${emote.name}`);

  const response = await fetch(variant.url);
  if (!response.ok) {
    throw new Error(`Downloading ${emote.name} failed with ${response.status}`);
  }
  const payload = Buffer.from(await response.arrayBuffer());

  const info = readImageInfo(payload);
  if (!needsTranscode(info, targetHeight, emote.animated)) {
    writeFileSync(output, payload);
    return output;
  }

  const plan = planTranscode(info, targetHeight, emote.animated);
  const binary = resolveTool(plan.tool, tools[plan.tool]);
  if (!binary) throw new ToolMissingError(plan.tool);

  const slug = emote.key.replace(":", "-");
  const source = join(cacheDir, `.src-${slug}.${info?.format ?? "bin"}`);
  writeFileSync(source, payload);
  try {
    await run(binary, plan.args(source, output), {
      timeout: TRANSCODE_TIMEOUT_MS,
    });
  } finally {
    rmSync(source, { force: true });
  }

  return output;
}
