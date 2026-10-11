import { existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

const FAVICON_PATHS = [
  "public/favicon.ico",
  "public/favicon.png",
  "public/favicon.svg",
  "app/favicon.ico",
  "src/app/favicon.ico",
  "static/favicon.ico",
  "static/favicon.png",
];

const cacheDir = join(tmpdir(), "orwell-favicons");

export async function resolveFavicon(projectDir: string, port: number): Promise<string | null> {
  // 1. Check local files
  for (const rel of FAVICON_PATHS) {
    const abs = join(projectDir, rel);
    if (existsSync(abs)) return abs;
  }

  // 2. Try fetching from the running server
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`http://localhost:${port}/favicon.ico`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 0) {
        await mkdir(cacheDir, { recursive: true });
        const hash = createHash("md5").update(projectDir).digest("hex").slice(0, 8);
        const cached = join(cacheDir, `favicon-${port}-${hash}.ico`);
        await writeFile(cached, buffer);
        return cached;
      }
    }
  } catch {
    // fetch failed — no favicon from server
  }

  return null;
}
