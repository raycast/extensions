import { AI, Tool } from "@raycast/api";
import { createDraft, getSocialSetDetail } from "../lib/api";
import { PLATFORM_KEYS, THREAD_PLATFORMS, type PlatformKey } from "../lib/constants";
import { resolveSocialSetId } from "../lib/resolve-social-set";
import type { DraftCreatePlatforms } from "../lib/types";
import { buildPostsFromContent } from "../lib/utils";

type Input = {
  /** The full text you want to post as a social media draft. Use --- on its own line to split a thread. */
  content?: string;
  /** Draft prompt or idea. Required if content is omitted. */
  prompt?: string;
  /** Platforms to post to. Subset of: x, linkedin, threads, bluesky, mastodon. If omitted, all enabled platforms on the social set are used. */
  platforms?: string[];
  /** Optional title for the draft. */
  title?: string;
  /** Optional ISO 8601 date to schedule the draft. */
  schedule_date?: string;
  /** Optional tags to apply to the draft. */
  tags?: string[];
};

async function resolveContent(input: Input) {
  const content = input.content?.trim();
  if (content) {
    return content;
  }

  const prompt = input.prompt?.trim();
  if (!prompt) {
    return "";
  }

  const aiPrompt = [
    "Write a social media draft for Typefully.",
    "Return ONLY the draft text. Do not add quotes or commentary.",
    "If the request is for a thread, separate posts with a line containing only ---.",
    `User request: ${prompt}`,
  ].join("\n");

  return (await AI.ask(aiPrompt, { creativity: "medium" })).trim();
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const platformLabel = input.platforms?.length ? input.platforms.join(", ") : "all enabled platforms";
  const content = input.content?.trim();
  const prompt = input.prompt?.trim();
  const previewSource = content || prompt || "";
  const preview = previewSource.length > 80 ? previewSource.slice(0, 80) + "…" : previewSource;
  const sourceLabel = content ? "content" : prompt ? "prompt" : "content";
  return {
    message: `Create draft on ${platformLabel} with ${sourceLabel}: "${preview}"?`,
  };
};

/**
 * Create a draft on Typefully.
 * IMPORTANT: Provide content (full draft text) or prompt (idea). Do not call without one.
 */
export default async function tool(input: Input) {
  const content = await resolveContent(input);
  if (!content) {
    throw new Error("Content is required. Provide draft text or a prompt to generate it.");
  }

  const scheduleDate = input.schedule_date?.trim();

  const socialSetId = await resolveSocialSetId();
  const threadPosts = buildPostsFromContent(content, true);
  const singlePost = buildPostsFromContent(content, false);

  if (threadPosts.length === 0) {
    throw new Error("Content is empty.");
  }

  const detail = await getSocialSetDetail(socialSetId);
  const enabledPlatforms = PLATFORM_KEYS.filter((key) => detail.platforms[key] !== null);

  const platformKeys = input.platforms?.length
    ? (input.platforms.filter((p) => enabledPlatforms.includes(p as PlatformKey)) as PlatformKey[])
    : enabledPlatforms;

  if (platformKeys.length === 0) {
    throw new Error(`Invalid platforms. Choose from: ${PLATFORM_KEYS.join(", ")}`);
  }

  const platforms: DraftCreatePlatforms = {};
  for (const platform of platformKeys) {
    platforms[platform] = {
      enabled: true,
      posts: THREAD_PLATFORMS.has(platform) ? threadPosts : singlePost,
    };
  }

  const draft = await createDraft(socialSetId, {
    platforms,
    draft_title: input.title ?? undefined,
    tags: input.tags?.length ? input.tags : undefined,
    publish_at: scheduleDate || undefined,
  });

  return {
    id: draft.id,
    status: draft.status,
    url: draft.private_url,
    share_url: draft.share_url,
    preview: draft.preview,
  };
}
