import { checkFollow } from "../lib/users";

type Input = {
  /**
   * The first account, as a username, @username, numeric user ID or profile link.
   */
  source: string;
  /**
   * The second account, as a username, @username, numeric user ID or profile link.
   */
  target: string;
};

/**
 * Check whether the source account follows the target account, and the reverse.
 * isFollowing means source follows target. isFollowedBy means target follows source.
 */
export default async function tool({ source, target }: Input) {
  return checkFollow(source, target);
}
