import { withGoogleAuth } from "../api/google";
import { loadSpaceItems } from "../api/spaces";
import { clampLimit, toolSpace } from "../helpers/ai";

type Input = {
  /**
   * Text to look for in the space title or the DM person's name or email (case-insensitive). Leave empty to list all.
   */
  query?: string;
  /**
   * Only list this kind of conversation.
   */
  type?: "DIRECT_MESSAGE" | "SPACE" | "GROUP_CHAT";
  /**
   * Maximum number of results, most recently active first. Defaults to 50, at most 200.
   */
  limit?: number;
};

const KIND = { DIRECT_MESSAGE: "dm", SPACE: "space", GROUP_CHAT: "group" } as const;

/** Lists the user's spaces, group chats and DMs, most recently active first. */
async function listSpaces(input: Input) {
  const query = input.query?.trim().toLowerCase();
  const items = (await loadSpaceItems()).filter(
    (item) =>
      (!input.type || item.kind === KIND[input.type]) &&
      (!query || item.title.toLowerCase().includes(query) || !!item.email?.toLowerCase().includes(query)),
  );
  return items.slice(0, clampLimit(input.limit, 50, 200)).map(toolSpace);
}

export default withGoogleAuth(listSpaces);
