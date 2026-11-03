import { LaunchProps } from "@raycast/api";
import { PostScreen } from "./components/post-screen";

export default function Command({ arguments: { post } }: LaunchProps<{ arguments: Arguments.GetPost }>) {
  return <PostScreen post={post} />;
}
