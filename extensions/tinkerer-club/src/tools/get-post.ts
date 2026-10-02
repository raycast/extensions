import { TinkererCommunity } from "../api/community";
import { getApiClient } from "../api/preferences";

type Input = {
  /** Exact Tinkerer Club post ID, usually obtained from get-feed or search-club. */
  postId: string;
};

export default async function getPost(input: Input) {
  const postId = input.postId.trim();
  if (!postId) throw new Error("A post ID is required.");
  return new TinkererCommunity(getApiClient()).thread(postId);
}
