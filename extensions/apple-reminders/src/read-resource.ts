import { getData, getLists } from "swift:../swift/AppleReminders";

import { parseListMentionUri, toListResource } from "./helpers/mentions";

type Input = {
  /** The URI of a list selected from the Lists mention search. */
  uri: string;
};

/** Reads the list when the message is sent, so reminders added or completed after it was mentioned are reflected. */
export default async function ({ uri }: Input) {
  const listId = parseListMentionUri(uri);
  const list = (await getLists()).find((list) => list.id === listId);
  if (!list) throw new Error("This Reminders list no longer exists.");
  const { reminders, hasMoreReminders } = await getData(listId);
  return toListResource(list, reminders, hasMoreReminders);
}
