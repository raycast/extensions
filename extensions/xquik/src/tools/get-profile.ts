import { compactProfile } from "../lib/format";
import { fetchProfile } from "../lib/users";

type Input = {
  /**
   * A username, @username, numeric user ID or profile link.
   */
  user: string;
};

/**
 * Read 1 X profile with its counts, bio, links and contact details.
 */
export default async function tool({ user }: Input) {
  return compactProfile(await fetchProfile(user));
}
