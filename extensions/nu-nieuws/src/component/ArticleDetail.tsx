import { ActionPanel, Detail } from "@raycast/api";
import { RSSItem } from "../util/rss";
import { getMarkDownContent } from "../util/formatting";
import LinkActions from "./LinkActions";

const ArticleDetail = ({ item }: { item: RSSItem }) => {
  const markdown = getMarkDownContent(item);

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <LinkActions item={item} />
        </ActionPanel>
      }
    />
  );
};

export default ArticleDetail;
