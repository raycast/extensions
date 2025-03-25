import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { RSSItem } from "../util/rss";
import ArticleDetail from "./ArticleDetail";
import LinkActions from "./LinkActions";

const GridItem = ({ item }: { item: RSSItem }) => {
  if (!item.enclosure?.url) {
    return null;
  }

  return (
    <Grid.Item
      key={item.guid}
      title={item.title!}
      accessory={{ icon: Icon.Clock, tooltip: `Last update: ${item.pubDate}` }}
      content={item.enclosure.url}
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

export default GridItem;
