import { Action, Tool } from "@raycast/api";
import { TraktListSchema } from "../lib/schema";
import { CompactList, toCompactList } from "./compact-media";
import { fetchAllLists } from "./list-api";
import { listNameEquals, listNameSimilar } from "./list-matching";
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
   * Visibility: "private" (default, only you), "link" (anyone with the share link),
   * "friends", or "public".
   */
  privacy?: "private" | "link" | "friends" | "public";
  /**
   * Show a position number next to each item. Useful for rankings. Defaults to false.
   */
  displayNumbers?: boolean;
  /**
   * Allow comments on the list. Trakt defaults to true.
   */
  allowComments?: boolean;
  /**
   * How items are ordered. Trakt defaults to "rank".
   */
  sortBy?:
    | "rank"
    | "added"
    | "title"
    | "released"
    | "runtime"
    | "popularity"
    | "random"
    | "percentage"
    | "imdb_rating"
    | "tmdb_rating"
    | "rt_tomatometer"
    | "rt_audience"
    | "metascore"
    | "votes"
    | "imdb_votes"
    | "tmdb_votes"
    | "my_rating"
    | "watched"
    | "collected";
  /**
   * Sort direction: "asc" (Trakt default) or "desc".
   */
  sortHow?: "asc" | "desc";
};

type Output = {
  success: boolean;
  /**
   * True when a list with the same name already existed and was reused instead of duplicated.
   */
  alreadyExisted: boolean;
  /**
   * True when a nearby name exists but is not the same list (emoji or punctuation differs).
   * Nothing was created or reused: confirm with the user first.
   */
  ambiguous?: boolean;
  message: string;
  list: CompactList;
  /**
   * Identifier to pass to `add-to-list`.
   */
  listId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const info = [
    { name: "Name", value: input.name },
    { name: "Privacy", value: input.privacy ?? "private" },
  ];

  if (input.description) info.push({ name: "Description", value: input.description });
  if (input.displayNumbers) info.push({ name: "Numbered", value: "Yes" });
  if (input.allowComments === false) info.push({ name: "Comments", value: "Off" });
  if (input.sortBy) info.push({ name: "Sort", value: `${input.sortBy}${input.sortHow ? ` ${input.sortHow}` : ""}` });

  return {
    style: Action.Style.Regular,
    message: `Create the personal list "${input.name}" on your Trakt account?`,
    info,
  };
};

/**
 * Create a new personal list on your Trakt account.
 * If a list with the same name (case and accents folded) already exists it is reused.
 * A nearby name that only matches after stripping emoji or punctuation is reported as
 * ambiguous and nothing is written.
 * Returns a `listId` to pass to `add-to-list`.
 */
export default async function tool(input: Input): Promise<Output> {
  const { name, description, privacy = "private", displayNumbers, allowComments, sortBy, sortHow } = input;

  const trimmedName = name?.trim();
  if (!trimmedName) {
    throw new Error("A list name is required.");
  }

  const existing = await fetchAllLists();
  if (!existing.exhaustive) {
    throw new Error(
      "Not every existing list could be read, so a duplicate cannot be ruled out. Nothing was created; " +
        "use `get-lists` with `query` to check for the name first.",
    );
  }

  const duplicate = existing.lists.find((list) => listNameEquals(list.name, trimmedName));
  if (duplicate) {
    const list = toCompactList(duplicate);
    return {
      success: true,
      alreadyExisted: true,
      message: `A list named "${list.name}" already exists (${list.itemCount} item(s)); reusing it instead of creating a duplicate.`,
      list,
      listId: list.listId,
    };
  }

  const similar = existing.lists.find((list) => listNameSimilar(list.name, trimmedName));
  if (similar) {
    const list = toCompactList(similar);
    return {
      success: false,
      alreadyExisted: false,
      ambiguous: true,
      message:
        `A list with a very similar name already exists ("${list.name}"). It was neither reused nor ` +
        `duplicated: confirm with the user which list they mean, then pass that \`listId\` to \`add-to-list\`.`,
      list,
      listId: list.listId,
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
          allow_comments: allowComments,
          sort_by: sortBy,
          sort_how: sortHow,
        },
        fetchOptions: { signal },
      }),
    `Failed to create the list "${trimmedName}"`,
  );

  const parsed = TraktListSchema.safeParse(res.body);
  if (!parsed.success) {
    throw new Error(
      `Trakt answered without returning the new list "${trimmedName}". Check with \`get-lists\` before retrying.`,
    );
  }

  const created = toCompactList(parsed.data);
  return {
    success: true,
    alreadyExisted: false,
    message: `Created the ${created.privacy ?? privacy} list "${created.name}".`,
    list: created,
    listId: created.listId,
  };
}
