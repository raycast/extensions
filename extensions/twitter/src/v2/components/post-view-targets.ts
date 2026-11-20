import { JSX } from "react";
import { Tweet } from "../lib/twitter";
import { Fetcher, PostEngagementKind } from "../lib/twitterapi_v2";

export type PostViewTargets = {
  showDetail: (props: { tweet: Tweet; fetcher?: Fetcher; canModerateReply?: boolean }) => JSX.Element;
  reply: (tweet: Tweet) => JSX.Element;
  quote: (postId: string) => JSX.Element;
  engagement: (postId: string, kind: PostEngagementKind) => JSX.Element;
  authorTweets: (authorID: string) => JSX.Element;
};

let targets: PostViewTargets | undefined;

export function registerPostViewTargets(next: PostViewTargets): void {
  targets = next;
}

export function postViewTargets(): PostViewTargets {
  if (!targets) {
    throw new Error("Post views are not registered");
  }
  return targets;
}
