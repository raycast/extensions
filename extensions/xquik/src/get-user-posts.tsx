import { LaunchProps } from "@raycast/api";
import { PostFeedList } from "./components/post-feed-list";

export default function Command({ arguments: { username } }: LaunchProps<{ arguments: Arguments.GetUserPosts }>) {
  return <PostFeedList feed={{ kind: "userPosts", user: username }} />;
}
