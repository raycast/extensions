import { listDrafts } from "../lib/api";
import { DRAFT_STATUS_LABELS, type DraftStatus } from "../lib/constants";
import { resolveToolSocialSetId } from "../lib/tool-helpers";
import { getDraftDate, getDraftDisplayTitle, getDraftSubtitle } from "../lib/utils";

type Input = {
  social_set_id?: number;
  /** Filter: draft, scheduled, published, error, or publishing. */
  status?: string;
  /** Tag slugs to filter by. */
  tags?: string[];
  limit?: number;
  offset?: number;
  /** Sort field, for example -updated_at, scheduled_date, or -published_at. */
  orderBy?: string;
};
export default async function tool(input: Input) {
  const socialSetId = await resolveToolSocialSetId(input.social_set_id);
  const response = await listDrafts(socialSetId, input);
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
