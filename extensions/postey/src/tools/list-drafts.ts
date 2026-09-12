import { listDrafts } from "../lib/api";
import { DRAFT_STATUS_LABELS, type DraftStatus } from "../lib/constants";
import { resolveSocialSetId } from "../lib/resolve-social-set";
import { getDraftDate, getDraftDisplayTitle, getDraftSubtitle } from "../lib/utils";

type Input = {
  /** Filter by status: draft, scheduled, published. If omitted, returns all. */
  status?: string;
  /** Maximum number of drafts to return. Defaults to 10. */
  limit?: number;
};

export default async function tool(input: Input) {
  const socialSetId = await resolveSocialSetId();
  const limit = input.limit ?? 10;
  const response = await listDrafts(socialSetId, {
    status: input.status,
    limit,
  });

  return response.results.map((draft) => ({
    id: draft.id,
    social_set_id: draft.social_set_id,
    title: getDraftDisplayTitle(draft),
    preview: getDraftSubtitle(draft),
    status: DRAFT_STATUS_LABELS[draft.status as DraftStatus] ?? draft.status,
    date: getDraftDate(draft)?.toISOString(),
    url: draft.private_url,
    tags: draft.tags,
  }));
}
