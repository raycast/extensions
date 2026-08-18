import { Tool } from "@raycast/api";
import { THREAD_PLATFORMS, type PlatformKey } from "../lib/constants";
import { getDraft, updateDraft } from "../lib/api";
import {
  applyXPostOptions,
  buildPlatforms,
  draftResult,
  preserveExistingSettings,
  resolveToolPlatforms,
  resolveToolSocialSetId,
  sanitizePost,
} from "../lib/tool-helpers";
import type { DraftCreatePlatforms, DraftUpdateRequest } from "../lib/types";

type Input = {
  draft_id: number;
  social_set_id?: number;
  /** Replacement post text. Use --- on its own line for a thread. Omit for metadata-only updates. */
  content?: string;
  /** Platforms whose content should be updated. Omit to update the draft's enabled post platforms. */
  platforms?: Array<"x" | "linkedin" | "threads" | "bluesky" | "mastodon">;
  /** Append content as new thread posts instead of replacing existing content. Thread platforms only. */
  append?: boolean;
  title?: string;
  scratchpad?: string;
  schedule?: string;
  tags?: string[];
  media_ids?: string[];
  share?: boolean;
  quote_post_url?: string;
  paid_partnership?: boolean;
  made_with_ai?: boolean;
  /** Destructive last resort. Only true after listing affected comments and receiving explicit confirmation. */
  force_overwrite_comments?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (input.schedule === "now")
    return { message: "Publish this draft immediately? This is public and cannot be undone." };
  if (input.force_overwrite_comments) {
    return {
      message:
        "Overwrite missing comment anchors? This resolves affected comment threads and cannot be undone via the API.",
    };
  }
  return undefined;
};

export default async function tool(input: Input) {
  const socialSetId = await resolveToolSocialSetId(input.social_set_id);
  const existing = await getDraft(socialSetId, input.draft_id);
  const payload: DraftUpdateRequest = {};

  if (input.append && input.content === undefined) {
    throw new Error("content is required when append is true.");
  }

  if (input.content !== undefined) {
    const enabled = input.platforms
      ? await resolveToolPlatforms(socialSetId, input.platforms)
      : Object.entries(existing.platforms ?? {})
          .filter(([, value]) => value?.enabled)
          .map(([key]) => key as PlatformKey);

    const newPlatforms = buildPlatforms(input.content, enabled, input.media_ids);
    if (input.append) {
      const unsupported = enabled.filter((platform) => !THREAD_PLATFORMS.has(platform));
      if (unsupported.length) {
        throw new Error(`Appending is only supported for thread platforms. Unsupported: ${unsupported.join(", ")}`);
      }
      payload.platforms = {};
      for (const platform of enabled) {
        const existingPlatform = existing.platforms?.[platform];
        const newPlatform = newPlatforms[platform];
        if (!existingPlatform || !newPlatform || !("posts" in newPlatform)) {
          throw new Error(`The draft has no existing ${platform} content to append to.`);
        }
        payload.platforms[platform] = {
          enabled: true,
          posts: [...existingPlatform.posts.map((post) => sanitizePost(post, platform)), ...newPlatform.posts],
          ...(existingPlatform.settings ? { settings: existingPlatform.settings } : {}),
        };
      }
    } else {
      payload.platforms = preserveExistingSettings(newPlatforms, existing);
    }

    if (payload.platforms.x && "posts" in payload.platforms.x) {
      payload.platforms.x.posts = applyXPostOptions(payload.platforms.x.posts, input);
    } else if (input.quote_post_url || input.paid_partnership || input.made_with_ai) {
      throw new Error("Quote and disclosure options require X to be updated.");
    }
  } else if (input.quote_post_url || input.paid_partnership || input.made_with_ai) {
    const xPosts = existing.platforms?.x?.posts;
    if (!xPosts?.length) throw new Error("This draft has no X posts to update.");
    const platforms: DraftCreatePlatforms = {
      x: {
        enabled: true,
        posts: applyXPostOptions(
          xPosts.map((post) => sanitizePost(post, "x")),
          input,
        ),
      },
    };
    payload.platforms = preserveExistingSettings(platforms, existing);
  }

  if (input.title !== undefined) payload.draft_title = input.title;
  if (input.scratchpad !== undefined) payload.scratchpad_text = input.scratchpad;
  if (input.schedule !== undefined) payload.publish_at = input.schedule;
  if (input.tags !== undefined) payload.tags = input.tags;
  if (input.share !== undefined) payload.share = input.share;
  if (input.force_overwrite_comments) payload.force_overwrite_comments = true;
  if (!Object.keys(payload).length) throw new Error("Provide at least one field to update.");

  return draftResult(await updateDraft(socialSetId, input.draft_id, payload));
}
