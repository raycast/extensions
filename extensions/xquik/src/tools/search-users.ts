import { compactProfile } from "../lib/format";
import { fetchUserPage } from "../lib/users";

type Input = {
  /**
   * A name or username to find.
   */
  query: string;
  /**
   * The nextCursor value of the previous call, to read the next 20 accounts.
   */
  cursor?: string;
};

/**
 * Find X accounts by name or username. Returns up to 20 accounts and a nextCursor when more exist.
 */
export default async function tool({ query, cursor }: Input) {
  const { users, nextCursor } = await fetchUserPage(query, cursor);
  return { users: users.map(compactProfile), nextCursor };
}
