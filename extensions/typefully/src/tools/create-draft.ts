import { Tool } from "@raycast/api";
import { createDraft } from "../lib/api";
import {
  applyXPostOptions,
  buildPlatforms,
  draftResult,
  resolveToolPlatforms,
  resolveToolSocialSetId,
} from "../lib/tool-helpers";

type Input = {
  /** Exact post text. Use --- on its own line to split a thread. */
  content: string;
  /** Optional social set ID. Omit to use the configured default. */
  social_set_id?: number;
  /** Platforms for this draft. Omit to use all connected platforms. */
  platforms?: Array<"x" | "linkedin" | "threads" | "bluesky" | "mastodon">;
  /** Internal draft title, never published. */
  title?: string;
  /** Internal scratchpad notes, never published. */
  scratchpad?: string;
  /** ISO 8601 time, next-free-slot, or now. Use now only when the user explicitly asks to publish immediately. */
  schedule?: string;
  /** Existing tag slugs. */
  tags?: string[];
  /** Existing ready media IDs to attach to the first post. */
  media_ids?: string[];
  /** Generate a public share URL. */
  share?: boolean;
  /** X post URL to reply to. X only. */
  reply_to_url?: string;
  /** X post URL to quote from the first post. X only. */
  quote_post_url?: string;
  /** X community ID. X only. */
  community_id?: string;
  /** Mark the X post as a paid partnership. */
  paid_partnership?: boolean;
  /** Mark the X post as made with AI. */
  made_with_ai?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (input.schedule !== "now") return undefined;
  return { message: "Publish this draft immediately? This is public and cannot be undone." };
};

export default async function tool(input: Input) {
  const socialSetId = await resolveToolSocialSetId(input.social_set_id);
  const platformKeys = await resolveToolPlatforms(socialSetId, input.platforms);
  if (
    (input.reply_to_url ||
      input.quote_post_url ||
      input.community_id ||
      input.paid_partnership ||
      input.made_with_ai) &&
    !platformKeys.includes("x")
  ) {
    throw new Error("Reply, quote, community, and disclosure options require X to be enabled.");
  }

  const platforms = buildPlatforms(input.content, platformKeys, input.media_ids);
  if (platforms.x && "posts" in platforms.x) {
    platforms.x.posts = applyXPostOptions(platforms.x.posts, input);
    if (input.reply_to_url || input.community_id) {
      platforms.x.settings = {
        ...(input.reply_to_url ? { reply_to_url: input.reply_to_url } : {}),
        ...(input.community_id ? { community_id: input.community_id } : {}),
      };
    }
  }

  const draft = await createDraft(socialSetId, {
    platforms,
    draft_title: input.title,
    scratchpad_text: input.scratchpad,
    tags: input.tags,
    publish_at: input.schedule,
    share: input.share,
  });
  return draftResult(draft);
}
