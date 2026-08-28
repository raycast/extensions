import { getDraft, getSocialSetDetail } from "./api";
import { PLATFORM_KEYS, THREAD_PLATFORMS, type PlatformKey } from "./constants";
import { resolveSocialSetId } from "./resolve-social-set";
import type { DraftCreatePlatforms, DraftDetail, Post } from "./types";
import { buildPostsFromContent } from "./utils";

export const POST_PLATFORMS = [...PLATFORM_KEYS] as const;
export type ToolPlatform = PlatformKey | "x_article";

export async function resolveToolSocialSetId(socialSetId?: number) {
  return resolveSocialSetId(socialSetId);
}

export async function resolveToolPlatforms(socialSetId: number, requested?: string[]): Promise<PlatformKey[]> {
  const detail = await getSocialSetDetail(socialSetId);
  const enabled = PLATFORM_KEYS.filter((key) => detail.platforms[key] !== null);
  if (!requested?.length) return enabled;
  const selected = requested.filter((value): value is PlatformKey => enabled.includes(value as PlatformKey));
  if (selected.length !== requested.length) {
    throw new Error(`One or more platforms are unavailable. Connected platforms: ${enabled.join(", ")}`);
  }
  return selected;
}

export function buildPlatforms(content: string, platforms: PlatformKey[], mediaIds?: string[]): DraftCreatePlatforms {
  const threadPosts = buildPostsFromContent(content, true);
  const singlePost = buildPostsFromContent(content, false);
  if (!threadPosts.length) throw new Error("Content is required.");

  const result: DraftCreatePlatforms = {};
  for (const platform of platforms) {
    const posts = (THREAD_PLATFORMS.has(platform) ? threadPosts : singlePost).map((post, index) => ({
      ...post,
      ...(index === 0 && mediaIds?.length ? { media_ids: mediaIds } : {}),
    }));
    result[platform] = { enabled: true, posts };
  }
  return result;
}

/**
 * Updating a platform replaces the whole platform object, so settings absent from the
 * payload are dropped. Carry the draft's stored settings over to keep X options such as
 * reply_to_url, community_id, and share_with_followers intact.
 */
export function preserveExistingSettings(platforms: DraftCreatePlatforms, existing: DraftDetail): DraftCreatePlatforms {
  for (const platform of PLATFORM_KEYS) {
    const target = platforms[platform];
    const settings = existing.platforms?.[platform]?.settings;
    if (target && "posts" in target && settings) target.settings = settings;
  }
  return platforms;
}

export type XPostOptions = {
  quote_post_url?: string;
  paid_partnership?: boolean;
  made_with_ai?: boolean;
};

/**
 * Disclosure labels describe the whole thread, so they apply to every post. A quote targets
 * one post, so it attaches to the first post only, the same rule buildPlatforms uses for
 * media_ids. Values already present on later posts are carried through untouched.
 */
export function applyXPostOptions(posts: Post[], options: XPostOptions): Post[] {
  return posts.map((post, index) => ({
    ...post,
    ...(index === 0 && options.quote_post_url ? { quote_post_url: options.quote_post_url } : {}),
    ...(options.paid_partnership ? { paid_partnership: true } : {}),
    ...(options.made_with_ai ? { made_with_ai: true } : {}),
  }));
}

export function sanitizePost(post: Post, platform: PlatformKey): Post {
  const clean: Post = { text: post.text };
  if (post.media_ids?.length) clean.media_ids = post.media_ids;
  if (platform === "x") {
    if (post.quote_post_url) clean.quote_post_url = post.quote_post_url;
    if (post.paid_partnership) clean.paid_partnership = true;
    if (post.made_with_ai) clean.made_with_ai = true;
  }
  return clean;
}

export function draftResult(draft: DraftDetail) {
  return {
    id: draft.id,
    social_set_id: draft.social_set_id,
    status: draft.status,
    title: draft.draft_title,
    preview: draft.preview,
    url: draft.private_url,
    share_url: draft.share_url,
    scheduled_date: draft.scheduled_date,
    published_at: draft.published_at,
    tags: draft.tags,
  };
}

export async function getDraftForTool(socialSetId: number, draftId: number) {
  return getDraft(socialSetId, draftId);
}
