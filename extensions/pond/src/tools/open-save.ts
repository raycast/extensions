import { open } from "@raycast/api";
import { loadSaves } from "../api/tools";
import { saveTitle } from "../lib/display";
import { isWebUrl, saveLink } from "../lib/links";
import { recordOpened } from "../lib/recent";

type Input = {
  /** Exact save ID from Search Saves. */
  id: string;
  /** Library ID returned with the save. */
  libraryId: string;
  /** Set true to open the original web page instead of the save in Pond. */
  original?: boolean;
};

export default async function tool(input: Input) {
  const [save] = await loadSaves([input.id], input.libraryId);
  if (!save) throw new Error("Pond has no save with that ID in this library. Search again to find it.");
  const target = input.original && isWebUrl(save.url) ? save.url : saveLink(save);
  await recordOpened(save);
  await open(target);
  return { opened: target, title: saveTitle(save) };
}
