import { promises as fs } from "fs";
import { createHash } from "crypto";
import path from "path";
import { ARTWORK_DIR } from "./paths";

export async function fetchArtwork(
  artist: string,
  title: string,
): Promise<string | null> {
  if (!artist && !title) return null;
  await fs.mkdir(ARTWORK_DIR, { recursive: true });
  const key = createHash("sha256")
    .update(`${artist}|${title}`)
    .digest("hex")
    .slice(0, 16);
  const dest = path.join(ARTWORK_DIR, `${key}.jpg`);

  if (await fileExists(dest)) return dest;

  const term = encodeURIComponent(`${artist} ${title}`.trim());
  const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`;

  let json: { results?: { artworkUrl100?: string }[] };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    json = (await res.json()) as typeof json;
  } catch {
    return null;
  }
  const small = json.results?.[0]?.artworkUrl100;
  if (!small) return null;
  // Replace 100x100bb.jpg with 600x600bb.jpg for higher resolution
  const big = small.replace(/\/\d+x\d+bb\.jpg$/, "/600x600bb.jpg");
  try {
    const imgRes = await fetch(big, { signal: AbortSignal.timeout(5000) });
    if (!imgRes.ok) return null;
    const buf = Buffer.from(await imgRes.arrayBuffer());
    await fs.writeFile(dest, buf);
    return dest;
  } catch {
    return null;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
