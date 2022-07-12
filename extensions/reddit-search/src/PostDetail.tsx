import { List } from "@raycast/api";
import RedditResultItem from "./RedditApi/RedditResultItem";

export default function PostDetail({ data }: { data: RedditResultItem }) {
  if (data.description) {
    return (
      <List.Item.Detail
        markdown={`# ${data.title}
  *Posted ${data.created}, r/${data.subreddit}*
                
  ${data.description}`}
      />
    );
  } else if (data.imageUrl) {
    return (
      <List.Item.Detail
        markdown={`# ${data.title}
  *Posted ${data.created}, r/${data.subreddit}*
                
  ![${data.title}](${data.imageUrl} "${data.title}}")`}
      />
    );
  } else if (data.contentUrl) {
    return (
      <List.Item.Detail
        markdown={`# ${data.title}
  *Posted ${data.created}, r/${data.subreddit}*
                
  ${data.contentUrl}`}
      />
    );
  } else {
    return (
      <List.Item.Detail
        markdown={`# ${data.title}
  *Posted ${data.created}, r/${data.subreddit}*
                
  ${data.url}`}
      />
    );
  }
}
