import { PostList } from "./components/post-list";

export default function Command() {
  return (
    <PostList
      filter={(p) => p.status === "sent"}
      dateField="sentAt"
      emptyTitle="No sent posts"
      showMetrics
    />
  );
}
