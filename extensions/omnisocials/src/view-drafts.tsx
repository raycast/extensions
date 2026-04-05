import { PostList } from "./components/post-list";

export default function ViewDraftsCommand() {
  return <PostList fixedStatus="draft" title="drafts" />;
}
