import { LaunchProps } from "@raycast/api";
import { PostArgument } from "./components/post-argument";
import { PostScreen } from "./components/post-screen";

export default function Command({ arguments: { post } }: LaunchProps<{ arguments: Arguments.GetPost }>) {
  return <PostArgument argument={post} title="Open Post" render={(id) => <PostScreen post={id} />} />;
}
