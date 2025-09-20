import { List } from "@raycast/api";

import { useNewsFeed } from "./hooks/useNewsFeed";

export default function Command() {
  const { isLoading, feed } = useNewsFeed();

  return (
    <List isLoading={isLoading} isShowingDetail>
      {feed &&
        feed.reverse().map((item) => {
          const title = item.message.replaceAll(/<\/?i=[0-d]+>/g, "").replaceAll("</i>", "");
          const message = item.message.replaceAll(/<\/?i=[0-d]+>\s*/g, "**").replaceAll("</i>", "**");

          return (
            <List.Item
              key={item.id}
              id={item.id.toString()}
              title={title}
              accessories={[{ date: item.publishedDate }]}
              detail={<List.Item.Detail markdown={message} />}
            />
          );
        })}
    </List>
  );
}
