import { Tool } from "@raycast/api";
import { clientV2 } from "../v2/lib/twitterapi_v2";
import { requirePostId } from "./inputs";

type Input = {
  /** Numeric ID of the X post to update. */
  postId: string;
  /** Whether the post should be bookmarked or removed from bookmarks. */
  bookmarked: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `${input.bookmarked ? "Bookmark" : "Remove the bookmark from"} this post on X?`,
  info: [{ name: "Post ID", value: input.postId.trim() }],
});

/** Add or remove a private bookmark after user confirmation. */
export default async function setBookmark(input: Input) {
  const postId = requirePostId(input.postId);
  if (input.bookmarked) await clientV2.bookmarkPost(postId);
  else await clientV2.removeBookmark(postId);
  return { postId, bookmarked: input.bookmarked };
}
