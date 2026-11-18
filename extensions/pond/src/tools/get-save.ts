import { summarize } from "../api/summary";
import { loadSaves } from "../api/tools";

type Input = {
  /** Exact save ID from Search Saves. */
  id: string;
  /** Library ID returned with the save. */
  libraryId: string;
};

export default async function tool(input: Input) {
  const [save] = await loadSaves([input.id], input.libraryId);
  if (!save) throw new Error("Pond has no save with that ID in this library. Search again to find it.");
  return {
    ...summarize(save),
    siteName: save.siteName,
    publishedAt: save.publishedAt ? new Date(save.publishedAt).toISOString() : null,
    status: save.status,
    media: save.media,
  };
}
