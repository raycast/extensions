import { clientV2 } from "../v2/lib/twitterapi_v2";

type Input = {
  /** Opaque continuation token returned by a preceding get-my-posts call. Only pass it when the user explicitly asks for more results. */
  nextToken?: string;
};

/** Get one page of posts and private analytics from the authenticated user's last 30 days. */
export default async function getMyPosts(input: Input) {
  return await clientV2.getMyTweets(input.nextToken);
}
