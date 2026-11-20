import type { Tool } from "@raycast/api";
import { pond } from "../api/client";
import { enqueue } from "../lib/capture";
import { folderPaths } from "../lib/display";
import { saveLink } from "../lib/links";
import { cleanTags, webUrl } from "../lib/urls";

type Input = {
  /** The full http or https URL to save to the active Pond library. */
  url: string;
  /** Tags to add. Only pass tags the user asked for. For a URL that's already saved, these join its current tags. */
  tags?: string[];
  /** Folder ID from List Folders. Only pass a folder the user asked for. */
  folderId?: string;
};

export default async function tool(input: Input) {
  const result = await enqueue(input.url, { tags: cleanTags(input.tags ?? []), folderId: input.folderId });
  const updated = Boolean(input.tags?.length || input.folderId);
  return {
    id: result.id,
    pondUrl: saveLink({ id: result.id }),
    outcome: result.created ? "queued" : updated ? "updated" : "already_saved",
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tags = cleanTags(input.tags ?? []);
  const folder = input.folderId
    ? folderPaths(await pond().folders()).find((item) => item.id === input.folderId)
    : undefined;
  return {
    info: [
      { name: "URL", value: webUrl(input.url) },
      ...(tags.length ? [{ name: "Tags", value: tags.join(", ") }] : []),
      ...(input.folderId ? [{ name: "Folder", value: folder?.path ?? input.folderId }] : []),
    ],
  };
};
