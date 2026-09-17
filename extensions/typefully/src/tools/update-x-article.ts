import { Tool } from "@raycast/api";
import { updateDraft } from "../lib/api";
import { draftResult, resolveToolSocialSetId } from "../lib/tool-helpers";
type Input = {
  draft_id: number;
  social_set_id?: number;
  content_markdown?: string;
  /** Ready media ID, or the literal string null to remove the cover. */
  cover_media_id?: string;
  title?: string;
  scratchpad?: string;
  tags?: string[];
  share?: boolean;
  schedule?: string;
  force_overwrite_comments?: boolean;
};
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (input.schedule === "now") return { message: "Publish this X Article immediately?" };
  if (input.force_overwrite_comments)
    return { message: "Overwrite missing X Article comment anchors? This cannot be undone via the API." };
  return undefined;
};
export default async function tool(input: Input) {
  if (input.content_markdown !== undefined && !input.content_markdown.trim().startsWith("# ")) {
    throw new Error("The first non-empty X Article block must be a # Title heading.");
  }
  const socialSetId = await resolveToolSocialSetId(input.social_set_id);
  const platform = {
    ...(input.content_markdown !== undefined ? { content_markdown: input.content_markdown } : {}),
    ...(input.cover_media_id !== undefined
      ? { cover_media_id: input.cover_media_id === "null" ? null : input.cover_media_id }
      : {}),
  };
  const payload = {
    ...(Object.keys(platform).length ? { platforms: { x_article: platform } } : {}),
    ...(input.title !== undefined ? { draft_title: input.title } : {}),
    ...(input.scratchpad !== undefined ? { scratchpad_text: input.scratchpad } : {}),
    ...(input.tags !== undefined ? { tags: input.tags } : {}),
    ...(input.share !== undefined ? { share: input.share } : {}),
    ...(input.schedule !== undefined ? { publish_at: input.schedule } : {}),
    ...(input.force_overwrite_comments ? { force_overwrite_comments: true } : {}),
  };
  if (!Object.keys(payload).length) throw new Error("Provide at least one field to update.");
  return draftResult(await updateDraft(socialSetId, input.draft_id, payload));
}
