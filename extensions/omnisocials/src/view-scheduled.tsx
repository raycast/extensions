import { PostList } from "./components/post-list";

export default function ViewScheduledCommand() {
  return <PostList fixedStatus="scheduled" title="scheduled posts" />;
}
