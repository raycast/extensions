import { listDrafts } from "../lib/storage";

type Input = {
  /** Optional case-insensitive substring of the saved title. */
  query?: string;
  /** Number of recent matching drafts, from 1 to 50. Defaults to 20. */
  limit?: number;
};

/** List local saved drafts with IDs for rendering, inspecting, editing, comparing, or deleting. */
export default async function list(input: Input) {
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("Limit must be an integer from 1 to 50.");
  const query = input.query?.trim().toLowerCase() ?? "";
  const drafts = (await listDrafts()).filter((draft) => draft.title.toLowerCase().includes(query));
  return {
    totalCount: drafts.length,
    drafts: drafts.slice(0, limit).map(({ id, title, savedAt }) => ({ id, title, savedAt })),
  };
}
