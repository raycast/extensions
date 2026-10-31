import { Tool } from "@raycast/api";
import { prepareUpdate, updateItemMetadata } from "../utils/ai-library";

type Input = {
  /** Exact active library ID returned by get-library. */
  libraryId: string;
  /** Exact item ID returned by find-items. Never guess an ID. */
  itemId: string;
  /** Set the name only when requested by the user. No path separators. */
  name?: string;
  /** Set the source HTTP(S) URL only when requested. An empty string clears it. */
  sourceUrl?: string;
  /** Set notes only when requested. An empty string clears them. Omission preserves them. */
  notes?: string;
  /** Set only a user-supplied integer rating from 0 to 5. Never infer a rating. Omission preserves it. */
  rating?: number;
  /** Add user-approved tags while preserving every existing tag. */
  tagsToAdd?: string[];
  /** Add existing folder IDs from get-library while preserving every current membership. */
  folderIdsToAdd?: string[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { library, folders, item } = await prepareUpdate(input);
  return {
    message: "Update these fields on this Eagle item? Existing tags and folder memberships are preserved.",
    info: [
      { name: "Library", value: `${library.name}\n${library.path}` },
      { name: "Item", value: `${item.name} (${item.id})` },
      { name: "Name", value: input.name },
      { name: "Source URL", value: input.sourceUrl === "" ? "Clear source URL" : input.sourceUrl },
      { name: "Notes", value: input.notes === "" ? "Clear notes" : input.notes },
      { name: "Rating", value: input.rating === undefined ? undefined : String(input.rating) },
      { name: "Add Tags", value: input.tagsToAdd?.join(", ") },
      { name: "Add Folders", value: folders.length ? folders.map((folder) => folder.path).join("\n") : undefined },
    ],
  };
};

/** Update only specified metadata. First call get-library, even if find-items already returned a libraryId. The tool reads the item before confirmation and execution. Ratings require an explicit user value; tags and folders are additive. Verify the returned status. */
export default async function tool(input: Input) {
  return updateItemMetadata(input);
}
