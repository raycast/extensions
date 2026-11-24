import { assertListAdded, ListItemKind, readListWrite, totalCount } from "../tools/list-write";
import { executeToolCall, toolTraktClient } from "../tools/tool-client";
import { TraktList, TraktListSchema } from "./schema";

export type ListPrivacy = "private" | "link" | "friends" | "public";
export type ListFields = { name: string; description?: string; privacy: ListPrivacy };

/** The id Trakt accepts in list paths: the Trakt id survives renames, unlike a slug read earlier. */
export const listPathId = (list: TraktList) => String(list.ids.trakt);

/** Creates a personal list and returns it as Trakt stored it. */
export async function createPersonalList(fields: ListFields): Promise<TraktList> {
  const response = await executeToolCall(
    (signal) => toolTraktClient.users.createList({ params: { id: "me" }, body: fields, fetchOptions: { signal } }),
    `Could not create the list "${fields.name}"`,
  );
  const parsed = TraktListSchema.safeParse(response.body);
  if (!parsed.success) throw new Error(`Trakt answered without returning the list "${fields.name}". Check your lists.`);
  return parsed.data;
}

/** Renames a list or changes its description or privacy, and checks Trakt returned the new name. */
export async function updatePersonalList(list: TraktList, fields: ListFields): Promise<TraktList> {
  const response = await executeToolCall(
    (signal) =>
      toolTraktClient.users.updateList({
        params: { id: "me", listId: listPathId(list) },
        body: fields,
        fetchOptions: { signal },
      }),
    `Could not update the list "${list.name}"`,
  );
  const parsed = TraktListSchema.safeParse(response.body);
  if (!parsed.success || parsed.data.name !== fields.name) {
    throw new Error(`Trakt did not confirm the changes to "${list.name}". Check the list.`);
  }
  return parsed.data;
}

/**
 * Deletes a list and every item on it. Trakt answers 204 with no body, and reading the list right after still
 * returns it for a while, so the status is the only confirmation available (as in the `delete-list` tool).
 */
export async function deletePersonalList(list: TraktList): Promise<void> {
  const response = await executeToolCall(
    (signal) =>
      toolTraktClient.users.deleteList({ params: { id: "me", listId: listPathId(list) }, fetchOptions: { signal } }),
    `Could not delete the list "${list.name}"`,
  );
  if (response.status !== 204) {
    throw new Error(`Trakt answered HTTP ${response.status} instead of confirming the deletion of "${list.name}".`);
  }
}

/** Adds one movie or show to a list. Returns false when it was already there. */
export async function addTitleToList(list: TraktList, kind: ListItemKind, traktId: number): Promise<boolean> {
  const response = await executeToolCall(
    (signal) =>
      toolTraktClient.users.addListItems({
        params: { id: "me", listId: listPathId(list) },
        body: { [kind]: [{ ids: { trakt: traktId } }] },
        fetchOptions: { signal },
      }),
    `Could not add to "${list.name}"`,
  );
  const result = readListWrite(response.body);
  assertListAdded(result, list.name);
  return totalCount(result.added) > 0;
}

/** Removes one entry from a list, checking Trakt deleted it rather than trusting the HTTP status. */
export async function removeTitleFromList(list: TraktList, kind: ListItemKind, traktId: number): Promise<void> {
  const response = await executeToolCall(
    (signal) =>
      toolTraktClient.users.removeListItems({
        params: { id: "me", listId: listPathId(list) },
        body: { [kind]: [{ ids: { trakt: traktId } }] },
        fetchOptions: { signal },
      }),
    `Could not remove from "${list.name}"`,
  );
  const result = readListWrite(response.body);
  if (!result.known || totalCount(result.deleted) === 0) {
    throw new Error(`Trakt removed nothing from "${list.name}". The item may already be gone.`);
  }
}
