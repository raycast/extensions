import { Toast } from "@raycast/api";

/**
 * Copy for a list `BuzzClient.queryAll` could not walk to the end (its page cap,
 * or a relay that could not advance). One place, so both list commands say the
 * same thing. The subtitle is the lasting signal; the toast is the one that
 * gets noticed; the empty-view copy stops an empty prefix posing as a bare relay.
 */
export const INCOMPLETE_SUBTITLE = "May be incomplete";

export const INCOMPLETE_EMPTY_DESCRIPTION =
  "Nothing found or matched in the records this extension could page through. The relay may have more, so the list may be incomplete.";

export function incompleteToast(list: "Channel" | "Conversation"): Toast.Options {
  return {
    style: Toast.Style.Failure,
    title: `${list} list may be incomplete`,
    message: "The relay may have more channel and conversation records than this extension could page through.",
  };
}
