import type { Post, RenderOptions } from "@xeet/core";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { detectInput } from "./input";
import type { Engine } from "./engine";

export interface ResolvedPost {
  post: Post;
  warnings: string[];
  source?: string;
}
const TTL = 15 * 60 * 1000;

export async function clearResolutionCache(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  for (const file of await readdir(directory))
    if (/^[a-f0-9]{64}\.json$/.test(file))
      await unlink(join(directory, file)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
}

export async function resolveInput(
  engine: Engine,
  input: string,
  options: RenderOptions,
  directory: string,
  signal: AbortSignal,
): Promise<ResolvedPost> {
  const parsed = detectInput(input);
  if (parsed.type === "post") {
    // explain() validates the full Post schema without ever hydrating links.
    await engine.explain(parsed.post, options, signal);
    return { post: parsed.post, warnings: [] };
  }
  signal.throwIfAborted();
  await mkdir(directory, { recursive: true });
  const cacheKey = createHash("sha256")
    .update(JSON.stringify([parsed.url, options.width, options.dpr, options.surface]))
    .digest("hex");
  const path = join(directory, `${cacheKey}.json`);
  // Bound retained media and remove expired entries, including other URLs.
  const files = (await readdir(directory)).filter((file) => /^[a-f0-9]{64}\.json$/.test(file));
  let cacheHit: ResolvedPost | undefined;
  const retained: { file: string; storedAt: number }[] = [];
  for (const file of files) {
    try {
      const cached = JSON.parse(await readFile(join(directory, file), "utf8"));
      if (!Number.isFinite(cached.storedAt) || Date.now() - cached.storedAt >= TTL) await unlink(join(directory, file));
      else {
        retained.push({ file, storedAt: cached.storedAt });
        if (file === `${cacheKey}.json`) {
          if (typeof cached.result?.post?.text !== "string" || !Array.isArray(cached.result?.warnings))
            throw new Error("Invalid cached post.");
          cacheHit = {
            ...cached.result,
            warnings: [...cached.result.warnings, "Loaded from a cache (up to 15 minutes old)."],
          };
        }
      }
    } catch {
      await unlink(join(directory, file)).catch(() => undefined);
    }
  }
  signal.throwIfAborted();
  if (cacheHit) {
    // Failed or canceled validation must not be mistaken for corrupt cache data.
    await engine.explain(cacheHit.post, options, signal);
    return cacheHit;
  }
  // Leave one slot for the new resolution; media is bounded to ten entries.
  for (const entry of retained.sort((a, b) => b.storedAt - a.storedAt).slice(9))
    await unlink(join(directory, entry.file)).catch(() => undefined);
  try {
    const resolved = await engine.resolve(parsed.url, options, AbortSignal.any([signal, AbortSignal.timeout(20_000)]));
    signal.throwIfAborted();
    if (
      resolved.source.id !== parsed.url.split("/").pop() ||
      (!resolved.post.text.trim() && !resolved.post.media?.length && !resolved.post.quote && !resolved.post.poll)
    ) {
      throw new Error("X did not return usable post content.");
    }
    await engine.explain(resolved.post, options, signal);
    signal.throwIfAborted();
    const result: ResolvedPost = { post: resolved.post, warnings: resolved.warnings, source: parsed.url };
    const content = JSON.stringify({ storedAt: Date.now(), result });
    if (Buffer.byteLength(content) < 16 * 1024 * 1024) await writeFile(path, content, { mode: 0o600 });
    return result;
  } catch (error) {
    if (signal.aborted) throw new Error("Resolution canceled.");
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not resolve this public post. It may be private, deleted, rate-limited, or unavailable from X. Retry, or paste its text or Xeet Post JSON. ${detail}`,
    );
  }
}
