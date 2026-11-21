import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { parseThread, type Media, type Post } from "./parse-post.ts";

export type Theme = "dark" | "dim" | "light";

const run = promisify(execFile);

const IMAGE_HOST = "pbs.twimg.com";
const IMAGE_TIMEOUT_MS = 15_000;
const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const RENDER_TIMEOUT_MS = 60_000;

interface RenderPost extends Omit<Post, "media" | "quote" | "avatar"> {
  avatarPath: string | null;
  media: (Media & { path: string | null })[];
  quote?: RenderPost;
}

async function download(url: string, dir: string, name: string): Promise<string | null> {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.hostname !== IMAGE_HOST) return null;
    const res = await fetch(u, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > IMAGE_MAX_BYTES) return null;
    const path = join(dir, name);
    await writeFile(path, bytes);
    return path;
  } catch {
    return null;
  }
}

async function withImages(post: Post, dir: string, tag: string): Promise<RenderPost> {
  const { avatar, media, quote, ...rest } = post;
  const [avatarPath, mediaPaths, quotePost] = await Promise.all([
    avatar ? download(avatar, dir, `${tag}-avatar`) : null,
    Promise.all(media.map((m, i) => download(m.url, dir, `${tag}-media${i}`))),
    quote ? withImages(quote, dir, `${tag}-q`) : undefined,
  ]);
  return { ...rest, avatarPath, media: media.map((m, i) => ({ ...m, path: mediaPaths[i] })), quote: quotePost };
}

export async function renderPost(pageHtml: string, theme: Theme, focalId: string, script: string): Promise<Buffer> {
  const thread = parseThread(pageHtml, focalId);
  const dir = await mkdtemp(join(tmpdir(), "hw_raycast_xscreenshot-"));
  try {
    const [parents, focal] = await Promise.all([
      Promise.all(thread.parents.map((p, i) => withImages(p, dir, `p${i}`))),
      withImages(thread.focal, dir, "f"),
    ]);
    const out = join(dir, "card.png");
    const specPath = join(dir, "spec.json");
    await writeFile(specPath, JSON.stringify({ theme, out, thread: { parents, focal } }));
    try {
      await run("/usr/bin/osascript", ["-l", "JavaScript", script, specPath], { timeout: RENDER_TIMEOUT_MS });
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr?.trim();
      throw new Error(`Rendering failed: ${stderr || (error instanceof Error ? error.message : String(error))}`);
    }
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
