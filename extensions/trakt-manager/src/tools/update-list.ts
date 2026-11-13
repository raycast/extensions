import { Action, Tool } from "@raycast/api";
import { TraktListSchema, TraktListWriteBody } from "../lib/schema";
import { CompactList, toCompactList } from "./compact-media";
import { fetchAllLists, getOwnList } from "./list-api";
import { assertListId, listNameEquals } from "./list-matching";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Trakt ID or slug of the list to update. Get it from `get-lists`.
   */
  listId: string;
  /**
   * New name. The list keeps its original slug, so existing links keep working.
   */
  name?: string;
  /**
   * New description. Pass an empty string to clear it.
   */
  description?: string;
  /**
   * New visibility: "private", "link" (anyone with the share link), "friends", or "public".
   */
  privacy?: "private" | "link" | "friends" | "public";
  /**
   * Show a position number next to each item.
   */
  displayNumbers?: boolean;
  /**
   * Allow comments on the list.
   */
  allowComments?: boolean;
  /**
   * How items are ordered.
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
   * Sort direction: "asc" or "desc".
   */
  sortHow?: "asc" | "desc";
};

type Output = {
  success: boolean;
  message: string;
  list: CompactList;
  /** Unchanged by a rename: Trakt keeps the original slug. */
  listId: string;
};

function buildBody(input: Input): TraktListWriteBody {
  const body: TraktListWriteBody = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.description !== undefined) body.description = input.description;
  if (input.privacy !== undefined) body.privacy = input.privacy;
  if (input.displayNumbers !== undefined) body.display_numbers = input.displayNumbers;
  if (input.allowComments !== undefined) body.allow_comments = input.allowComments;
  if (input.sortBy !== undefined) body.sort_by = input.sortBy;
  if (input.sortHow !== undefined) body.sort_how = input.sortHow;
  return body;
}

function describeChanges(body: TraktListWriteBody): { name: string; value: string }[] {
  const changes: { name: string; value: string }[] = [];
  if (body.name !== undefined) changes.push({ name: "New name", value: body.name });
  if (body.description !== undefined) changes.push({ name: "Description", value: body.description || "(cleared)" });
  if (body.privacy !== undefined) changes.push({ name: "Privacy", value: body.privacy });
  if (body.display_numbers !== undefined)
    changes.push({ name: "Numbered", value: body.display_numbers ? "Yes" : "No" });
  if (body.allow_comments !== undefined) changes.push({ name: "Comments", value: body.allow_comments ? "On" : "Off" });
  if (body.sort_by !== undefined) changes.push({ name: "Sort by", value: body.sort_by });
  if (body.sort_how !== undefined) changes.push({ name: "Sort direction", value: body.sort_how });
  return changes;
}

function assertBody(body: TraktListWriteBody): void {
  if (Object.keys(body).length === 0) {
    throw new Error(
      "Nothing to update: pass at least one of name, description, privacy, displayNumbers, allowComments, sortBy or sortHow.",
    );
  }
  if (body.name !== undefined && !body.name) {
    throw new Error("A list name cannot be empty.");
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const body = buildBody(input);
  assertBody(body);
  const current = await getOwnList(input.listId);

  return {
    style: Action.Style.Regular,
    message: `Update the Trakt list "${current.name}"?`,
    info: [{ name: "List", value: current.name }, ...describeChanges(body)],
  };
};

/**
 * Update the name, description, privacy, numbering, comments or sorting of one of your Trakt
 * personal lists. Renaming keeps the list's slug, so its `listId` does not change.
 */
export default async function tool(input: Input): Promise<Output> {
  const listId = assertListId(input.listId);
  const body = buildBody(input);
  assertBody(body);
  const current = await getOwnList(listId);

  if (body.name !== undefined && !listNameEquals(body.name, current.name)) {
    const { lists } = await fetchAllLists();
    const clash = lists.find(
      (list) => list.ids.trakt !== current.ids.trakt && listNameEquals(list.name, body.name ?? ""),
    );
    if (clash) {
      throw new Error(`Another list is already named "${clash.name}". Nothing was changed; pick a different name.`);
    }
  }

  const res = await executeToolCall(
    (signal) =>
      toolTraktClient.users.updateList({
        params: { id: "me", listId },
        body,
        fetchOptions: { signal },
      }),
    `Failed to update the list "${current.name}"`,
  );

  const parsed = TraktListSchema.safeParse(res.body);
  if (!parsed.success) {
    throw new Error(`Trakt did not return the updated list "${current.name}". Check it with \`get-lists\`.`);
  }

  const updated = toCompactList(parsed.data);
  if (body.name !== undefined && updated.name !== body.name) {
    throw new Error(`Trakt kept the name "${updated.name}" instead of "${body.name}". Check the list before retrying.`);
  }

  return {
    success: true,
    message:
      body.name !== undefined && body.name !== current.name
        ? `Renamed "${current.name}" to "${updated.name}". Its listId stays "${updated.listId}".`
        : `Updated the list "${updated.name}".`,
    list: updated,
    listId: updated.listId,
  };
}
