import { Action, Tool } from "@raycast/api";
import { CompactList, toCompactList } from "./compact-media";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Name of the list. Emojis are supported (e.g. "🎬 Oscars 2026").
   */
  name: string;
  /**
   * Optional description explaining what the list contains.
   */
  description?: string;
  /**
   * Visibility of the list: "private" (default), "friends", or "public".
   */
  privacy?: "private" | "friends" | "public";
  /**
   * Show a position number next to each item. Useful for rankings. Defaults to false.
   */
  displayNumbers?: boolean;
  /**
   * How items are ordered: "rank", "added", "title", "released", "runtime", "popularity", "votes", "my_rating", "random".
   */
  sortBy?: string;
  /**
   * Sort direction: "asc" or "desc".
   */
  sortHow?: "asc" | "desc";
};

type Output = {
  success: boolean;
  /**
   * True when a list with the same name already existed and was reused instead of duplicated.
   */
  alreadyExisted: boolean;
  message: string;
  list: CompactList;
  /**
   * Identifier to pass to `add-to-list`.
   */
  listId: string;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const info = [
    { name: "Name", value: input.name },
    { name: "Privacy", value: input.privacy ?? "private" },
  ];

  if (input.description) {
    info.push({ name: "Description", value: input.description });
  }
  if (input.displayNumbers) {
    info.push({ name: "Numbered", value: "Yes" });
  }

  return {
    style: Action.Style.Regular,
    message: `Create the personal list "${input.name}" on your Trakt account?`,
    info,
  };
};

/**
 * Create a new personal list on your Trakt account.
 * If a list with the same name already exists it is reused instead of creating a duplicate.
 * Returns a `listId` to pass to `add-to-list`.
 */
export default async function tool(input: Input): Promise<Output> {
  const { name, description, privacy = "private", displayNumbers, sortBy, sortHow } = input;

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("A list name is required.");
  }

  const existingRes = await executeToolCall(
    (signal) =>
      toolTraktClient.users.getLists({
        params: { id: "me" },
        fetchOptions: { signal },
      }),
    "Failed to check your existing Trakt lists",
  );

  const duplicate = existingRes.body.find((list) => normalize(list.name) === normalize(trimmedName));
  if (duplicate) {
    const existing = toCompactList(duplicate);
    return {
      success: true,
      alreadyExisted: true,
      message: `A list named "${existing.name}" already exists (${existing.itemCount} item(s)); reusing it instead of creating a duplicate.`,
      list: existing,
      listId: existing.slug ?? String(existing.traktId),
    };
  }

  const res = await executeToolCall(
    (signal) =>
      toolTraktClient.users.createList({
        params: { id: "me" },
        body: {
          name: trimmedName,
          description,
          privacy,
          display_numbers: displayNumbers,
          sort_by: sortBy,
          sort_how: sortHow,
        },
        fetchOptions: { signal },
      }),
    `Failed to create the list "${trimmedName}"`,
  );

  const created = toCompactList(res.body);

  return {
    success: true,
    alreadyExisted: false,
    message: `Created the ${created.privacy ?? privacy} list "${created.name}".`,
    list: created,
    listId: created.slug ?? String(created.traktId),
  };
}
