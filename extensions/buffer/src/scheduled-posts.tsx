import { PostList } from "./components/post-list";

export default function Command() {
  return (
    <PostList
      // Queued/scheduled = has a due date and isn't a draft or already sent.
      filter={(p) => !!p.dueAt && p.status !== "draft" && p.status !== "sent"}
      dateField="dueAt"
      emptyTitle="No scheduled posts"
    />
  );
}
