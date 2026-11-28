import { LaunchProps } from "@raycast/api";
import { PostFeedList } from "./components/post-feed-list";

export default function Command({ arguments: { username } }: LaunchProps<{ arguments: Arguments.GetUserMentions }>) {
  return <PostFeedList feed={{ kind: "mentions", user: username }} />;
}
