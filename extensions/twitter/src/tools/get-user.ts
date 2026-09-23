import { clientV2 } from "../v2/lib/twitterapi_v2";

type Input = {
  /** Exact X username or handle, with or without the leading @. */
  username: string;
  /** Set to true only when the user asks for this account's recent posts. This causes an additional billed read. */
  includeRecentPosts?: boolean;
  /** Opaque continuation token returned by a preceding get-user call. Only use with includeRecentPosts when the user explicitly asks for more posts. */
  nextToken?: string;
};

/** Get an X user profile and, when explicitly requested, one page of their recent posts. */
export default async function getUser(input: Input) {
  const username = input.username.trim().replace(/^@/, "");
  if (!username) throw new Error("An exact X username is required.");
  if (input.nextToken && !input.includeRecentPosts) {
    throw new Error("includeRecentPosts must be true when a nextToken is provided.");
  }

  const user = await clientV2.getUserByUsername(username);
  if (!input.includeRecentPosts) return { user };

  const page = await clientV2.getTweetsFromAuthor(user.id, [], input.nextToken);
  return { user, recentPosts: page.items, nextToken: page.nextToken };
}
