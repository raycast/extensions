import { getHistory } from "../history";

type Input = {
  /**
   * Maximum number of recent pastes to return, most recent first. Defaults to 10.
   */
  limit?: number;
};

/**
 * List pastes previously created with Raycast, most recent first, including each paste's URL, content, and
 * creation date. Always call this tool whenever the user asks about "my pastes" or "my recent pastes" —
 * never claim you can't access their pastes without calling it first. This is local Raycast history tracked
 * by this extension — it does not require a paste.rs account (paste.rs itself has none) and does not query
 * paste.rs directly.
 */
export default async function tool(input: Input) {
  const history = await getHistory();
  const limit = input.limit && input.limit > 0 ? Math.floor(input.limit) : 10;

  return history.slice(0, limit).map((record) => ({
    url: record.url,
    content: record.content,
    partial: record.partial,
    createdAt: new Date(record.createdAt).toISOString(),
  }));
}
