import { Color } from "@raycast/api";
import { PLATFORM_KEYS, type PlatformKey } from "../lib/constants";
import type { DraftDetail, DraftListItem, Post } from "../lib/types";

const TAG_COLORS: Color[] = [
  Color.Blue,
  Color.Green,
  Color.Magenta,
  Color.Orange,
  Color.Purple,
  Color.Red,
  Color.Yellow,
];

export function getDetailPosts(detail?: DraftDetail): Post[] | undefined {
  if (!detail?.platforms) return undefined;
  for (const key of PLATFORM_KEYS) {
    const platform = detail.platforms[key];
    if (platform && "posts" in platform && platform.posts?.length > 0) {
      return platform.posts;
    }
  }
  return undefined;
}

export function getDetailFullText(detail?: DraftDetail): string | undefined {
  const posts = getDetailPosts(detail);
  if (!posts) return undefined;
  return posts.map((post) => post.text).join("\n\n");
}

export function getEnabledPlatforms(detail?: DraftDetail): PlatformKey[] {
  if (!detail?.platforms) return [];
  return PLATFORM_KEYS.filter((key) => {
    const platform = detail.platforms?.[key];
    return platform && "enabled" in platform && platform.enabled;
  });
}

export function getPublishedLinks(detail?: DraftDetail): Array<{ platform: PlatformKey; url: string }> {
  if (!detail) return [];
  const links: Array<{ platform: PlatformKey; url: string }> = [];
  const urlKeys: Record<PlatformKey, keyof DraftDetail> = {
    x: "x_published_url",
    linkedin: "linkedin_published_url",
    threads: "threads_published_url",
    bluesky: "bluesky_published_url",
    mastodon: "mastodon_published_url",
  };
  for (const key of PLATFORM_KEYS) {
    const url = detail[urlKeys[key]] as string | null | undefined;
    if (url) {
      links.push({ platform: key, url });
    }
  }
  return links;
}

export function getTagColor(slug: string): Color {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function getDetailMediaIds(detail?: DraftDetail): string[] {
  const posts = getDetailPosts(detail);
  if (!posts) return [];
  const ids = new Set<string>();
  for (const post of posts) {
    if (post.media_ids) {
      for (const id of post.media_ids) {
        ids.add(id);
      }
    }
  }
  return Array.from(ids);
}

export function getScheduledSortTime(draft: DraftListItem) {
  if (!draft.scheduled_date) {
    return undefined;
  }
  const date = new Date(draft.scheduled_date);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.getTime();
}

export function formatScheduledDateTime(date: Date) {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
