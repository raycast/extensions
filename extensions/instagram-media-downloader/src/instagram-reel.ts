/**
 * Reads a story or highlight out of the JSON Instagram embeds in its page, as returned by the
 * Raycast browser extension. Like `instagram-post`, free of `@raycast/api` so it stays
 * unit-testable.
 *
 * Both pages carry a "reel": an object with `reel_type` and an `items` array, one item per story.
 * A highlight's reel has the id `highlight:<id>`; a user's story reel names its owner in
 * `user.username`, and each story is the item whose `pk` is the id in the link.
 */
import { bestUrl, ExtractMissReason, isExpiring, itemMedia, PostMedia, scriptContents } from "./instagram-post";
import { InstagramStoryRef } from "./instagram-url";

export type ReelItem = PostMedia & { id: string; thumbnail: string };
export type ReelResult = { ok: true; items: ReelItem[] } | { ok: false; reason: ExtractMissReason };

type ReelNode = { id?: unknown; reel_type?: unknown; user?: { username?: unknown } | null; items?: unknown };
type ReelItemNode = { pk?: unknown; image_versions2?: { candidates?: unknown } | null };

function isReel(value: unknown): value is ReelNode & { items: unknown[] } {
  if (typeof value !== "object" || value === null) return false;
  const node = value as ReelNode;
  return typeof node.reel_type === "string" && Array.isArray(node.items);
}

/** Every reel object in the page's JSON blocks. */
function findReels(html: string): (ReelNode & { items: unknown[] })[] {
  const reels: (ReelNode & { items: unknown[] })[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (typeof value === "object" && value !== null) {
      if (isReel(value)) reels.push(value);
      Object.values(value).forEach(visit);
    }
  };

  for (const block of scriptContents(html)) {
    if (!block.includes('"reel_type"')) continue;
    try {
      visit(JSON.parse(block));
    } catch {
      // Not a JSON block; nothing in it is a reel.
    }
  }
  return reels;
}

function isTarget(reel: ReelNode, ref: InstagramStoryRef): boolean {
  if (ref.kind === "highlight") return reel.id === `highlight:${ref.highlightId}`;
  const owner = reel.user?.username;
  return typeof owner === "string" && owner.toLowerCase() === ref.user.toLowerCase();
}

/** One story's file and thumbnail, or null when its declared type has no downloadable file. */
function reelItem(node: unknown): ReelItem | null {
  const media = itemMedia(node);
  if (!media) return null;
  const item = node as ReelItemNode;
  return {
    ...media,
    id: String(item.pk ?? ""),
    // A video's thumbnail is its poster; an image is its own.
    thumbnail: bestUrl(item.image_versions2?.candidates) ?? media.url,
  };
}

/** One copy of the reel, judged on the items the link asks for. */
function judgeReel(reel: { items: unknown[] }, ref: InstagramStoryRef, nowSeconds: number): ReelResult {
  // A story link names one story; without an id it means the first, as Instagram plays them.
  // Only that story is judged, so a broken later story can't block it.
  const wanted =
    ref.kind === "highlight"
      ? reel.items
      : ref.storyId
        ? reel.items.filter((node) => String((node as ReelItemNode)?.pk) === ref.storyId)
        : reel.items.slice(0, 1);
  if (wanted.length === 0) return { ok: false, reason: "not-found" };

  const items = wanted.map(reelItem);
  if (!items.every((item): item is ReelItem => item !== null)) return { ok: false, reason: "incomplete" };
  if (isExpiring(items, nowSeconds)) return { ok: false, reason: "expired" };
  return { ok: true, items };
}

export function extractReelMedia(html: string, ref: InstagramStoryRef, nowSeconds = Date.now() / 1000): ReelResult {
  // A page can name the same reel more than once, and a copy can be stale or partial: judge each,
  // fullest first, and use the first usable one.
  const copies = findReels(html)
    .filter((candidate) => isTarget(candidate, ref))
    .sort((a, b) => b.items.length - a.items.length);
  if (copies.length === 0) return { ok: false, reason: "not-found" };

  // A highlight is downloaded whole, so a shorter copy would silently drop stories.
  const fullest = copies[0].items.length;
  const usable = ref.kind === "highlight" ? copies.filter((reel) => reel.items.length === fullest) : copies;
  const results = usable.map((reel) => judgeReel(reel, ref, nowSeconds));
  return results.find((result) => result.ok) ?? results[0];
}
