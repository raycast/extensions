import type { Tool } from "@raycast/api";
import { pond } from "../api/client";
import { describeSaves } from "../api/tools";
import { cleanTags } from "../lib/urls";

type Input = {
  /** Save IDs from Search Saves, all from the same library. */
  ids: string[];
  /** Library ID returned with the saves. */
  libraryId: string;
  /** Tags to add. */
  add?: string[];
  /** Tags to remove. */
  remove?: string[];
};

export default async function tool(input: Input) {
  const add = cleanTags(input.add ?? []);
  const remove = cleanTags(input.remove ?? []);
  if (!add.length && !remove.length) throw new Error("Pass at least one tag to add or remove.");
  return pond().editTags({ ids: input.ids, libraryId: input.libraryId, add, remove });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const add = cleanTags(input.add ?? []);
  const remove = cleanTags(input.remove ?? []);
  return {
    info: [
      { name: "Saves", value: await describeSaves(input.ids, input.libraryId) },
      ...(add.length ? [{ name: "Add", value: add.join(", ") }] : []),
      ...(remove.length ? [{ name: "Remove", value: remove.join(", ") }] : []),
    ],
  };
};
