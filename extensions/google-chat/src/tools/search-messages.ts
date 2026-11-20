import { searchMessages } from "../api/chat";
import { withGoogleAuth } from "../api/google";
import { loadSpaceItems } from "../api/spaces";
import { clampLimit, toolMessage } from "../helpers/ai";
import { spaceNameOf } from "../helpers/recipient";
import { buildSearchFilter, type SearchMode } from "../helpers/search";

type Input = {
  /**
   * Keywords to search for. Every word must appear. Leave empty to get recent messages (last 7 days) matching the other filters.
   */
  query?: string;
  /**
   * Only messages the user hasn't read.
   */
  unreadOnly?: boolean;
  /**
   * Only messages that @mention the user.
   */
  mentionsMe?: boolean;
  /**
   * Only messages that contain a link.
   */
  hasLink?: boolean;
  /**
   * Maximum number of messages, newest first. Defaults to 25, at most 100.
   */
  limit?: number;
};

/** Searches messages across all spaces and DMs (muted spaces excluded by Google). */
async function search(input: Input) {
  const modes: SearchMode[] = [];
  if (input.unreadOnly) modes.push("unread");
  if (input.mentionsMe) modes.push("mentions");
  if (input.hasLink) modes.push("links");
  const [response, items] = await Promise.all([
    searchMessages({
      filter: buildSearchFilter(input.query ?? "", modes),
      pageSize: clampLimit(input.limit, 25, 100),
    }),
    loadSpaceItems(),
  ]);
  const spaces = new Map(items.map((item) => [item.space.name, item]));
  return (response.results ?? []).flatMap((result) =>
    result.message
      ? [toolMessage(result.message, spaces.get(result.message.space?.name ?? spaceNameOf(result.message.name)))]
      : [],
  );
}

export default withGoogleAuth(search);
