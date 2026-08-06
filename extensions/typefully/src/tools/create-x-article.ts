import { Tool } from "@raycast/api";
import { createDraft } from "../lib/api";
import { draftResult, resolveToolSocialSetId } from "../lib/tool-helpers";
type Input = {
  /** Canonical article markdown. The first non-empty block must be # Title. */
  content_markdown: string;
  social_set_id?: number;
  cover_media_id?: string;
  title?: string;
  scratchpad?: string;
  tags?: string[];
  share?: boolean;
  /** ISO 8601, next-free-slot, or now. */
  schedule?: string;
};
export const confirmation: Tool.Confirmation<Input> = async (input) =>
  input.schedule === "now" ? { message: "Publish this X Article immediately?" } : undefined;
export default async function tool(input: Input) {
  if (!input.content_markdown.trim().startsWith("# "))
    throw new Error("The first non-empty X Article block must be a # Title heading.");
  const socialSetId = await resolveToolSocialSetId(input.social_set_id);
  return draftResult(
    await createDraft(socialSetId, {
      platforms: { x_article: { content_markdown: input.content_markdown, cover_media_id: input.cover_media_id } },
      draft_title: input.title,
      scratchpad_text: input.scratchpad,
      tags: input.tags,
      share: input.share,
      publish_at: input.schedule,
    }),
  );
}
