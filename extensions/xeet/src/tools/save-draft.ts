import { resolveSource, saveToolDraft, type PostSource, type RenderingOptions } from "../lib/ai";
import { loadDraft } from "../lib/storage";

type Input = {
  source: PostSource;
  options?: RenderingOptions;
  /** Replace an existing draft using its exact ID from list-drafts. Otherwise updates source.draftId or saves a new draft. */
  replaceDraftId?: string;
};

/** Save a post locally, or update an existing draft. Use source.replacementText to edit text without losing media. Repeating the same new save does not duplicate it. */
export default async function save(input: Input) {
  const id = input.replaceDraftId ?? input.source.draftId;
  if (id) await loadDraft(id);
  const { post, options } = await resolveSource(input.source, input.options);
  return { draft: await saveToolDraft(post, options, id) };
}
