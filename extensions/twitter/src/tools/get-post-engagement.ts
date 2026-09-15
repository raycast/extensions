import { clientV2, PostEngagementKind } from "../v2/lib/twitterapi_v2";
import { requirePostId } from "./inputs";

type Input = {
  /** Numeric ID of the X post whose engagement should be listed. */
  postId: string;
  /** Engagement collection to retrieve. */
  kind: PostEngagementKind;
  /** Opaque continuation token returned by a preceding call. Only pass it when the user explicitly asks for more. */
  nextToken?: string;
};

/** Get one page of users who liked or reposted a post, or posts that quote it. */
export default async function getPostEngagement(input: Input) {
  const postId = requirePostId(input.postId);
  if (input.kind === "quotes") return await clientV2.quotedPosts(postId, input.nextToken);
  return await clientV2.postEngagementUsers(postId, input.kind, input.nextToken);
}
