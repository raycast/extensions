import type { Tool } from "@raycast/api";
import { resolveSource, saveToolDraft, type PostSource, type RenderingOptions } from "../lib/ai";
import { loadDraft } from "../lib/storage";

type Input = {
  source: PostSource;
  options?: RenderingOptions;
  /** Replace an existing draft using its exact ID from list-drafts. Otherwise updates source.draftId or saves a new draft. */
  replaceDraftId?: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({ source, replaceDraftId }) => {
  const id = replaceDraftId ?? source.draftId;
  const draft = id ? await loadDraft(id) : undefined;
  return {
    message: draft ? `Replace saved draft “${draft.title}”?` : "Save this post to Saved Drafts?",
    info: [
      { name: "Draft", value: draft?.title ?? "New draft" },
      { name: "Draft ID", value: id },
      { name: "Source", value: source.clipboard ? "Clipboard text" : (source.draftId ?? source.input?.slice(0, 200)) },
      { name: "Replacement Text", value: source.replacementText?.slice(0, 200) },
    ],
  };
};

/** Save a post locally, or update an existing draft. Use source.replacementText to edit text without losing media. Repeating the same new save does not duplicate it. */
export default async function save(input: Input) {
  const id = input.replaceDraftId ?? input.source.draftId;
  if (id) await loadDraft(id);
  const { post, options } = await resolveSource(input.source, input.options);
  return { draft: await saveToolDraft(post, options, id) };
}
