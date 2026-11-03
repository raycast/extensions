import { LaunchProps } from "@raycast/api";
import { PostFeedList } from "./components/post-feed-list";

export default function Command({ arguments: { post } }: LaunchProps<{ arguments: Arguments.GetPostReplies }>) {
  return <PostFeedList feed={{ kind: "replies", post }} />;
}
