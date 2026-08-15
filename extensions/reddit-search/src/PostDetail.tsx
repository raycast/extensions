import { List } from "@raycast/api";
import RedditResultItem from "./RedditApi/RedditResultItem";
import { postMarkdown } from "./util/postMarkdown";

export default function PostDetail({ data }: { data: RedditResultItem }) {
  return <List.Item.Detail markdown={postMarkdown(data)} />;
}
