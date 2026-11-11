import { LaunchProps } from "@raycast/api";
import { PostArgument } from "./components/post-argument";
import { PostFeedList } from "./components/post-feed-list";

export default function Command({ arguments: { post } }: LaunchProps<{ arguments: Arguments.GetPostReplies }>) {
  return (
    <PostArgument
      argument={post}
      title="View Replies"
      render={(id) => <PostFeedList feed={{ kind: "replies", post: id }} />}
    />
  );
}
