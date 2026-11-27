import { getLists } from "swift:../../swift/AppleReminders";

import { getListMentionIcon } from "../helpers/mention-icons";
import { toListMentions } from "../helpers/mentions";

type Input = {
  /** What the user typed in the Lists mention search, empty for every list. */
  query: string;
};

/** Reads only the lists, not their reminders, so the search stays instant however many reminders there are. */
export default async function ({ query }: Input) {
  return toListMentions(await getLists(), query, getListMentionIcon);
}
