import { PostList } from "./components/post-list";

export default function Command() {
  return (
    <PostList
      filter={(p) => p.status === "draft"}
      dateField="createdAt"
      emptyTitle="No drafts"
    />
  );
}
