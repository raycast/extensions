import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { RSSItem } from "../util/rss";
import ArticleDetail from "./ArticleDetail";
import LinkActions from "./LinkActions";
import { getItemIcon } from "../util/icon";

const ListItem = ({ item }: { item: RSSItem }) => {
  return (
    <List.Item
      key={item.guid}
      title={item.title!}
      icon={getItemIcon(item)}
      accessories={[{ text: item.ago, icon: Icon.Clock, tooltip: `Last update: ${item.pubDate}` }]}
      keywords={item.categories}
      subtitle={item.categories?.join(", ")}
      actions={
        <ActionPanel>
          <Action.Push title="Details" target={<ArticleDetail item={item} />} />
          <LinkActions item={item} />
        </ActionPanel>
      }
    />
  );
};

export default ListItem;
