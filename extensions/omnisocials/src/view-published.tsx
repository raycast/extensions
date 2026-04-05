import { PostList } from "./components/post-list";

export default function ViewPublishedCommand() {
  return <PostList fixedStatus="posted" title="published posts" />;
}
