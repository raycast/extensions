import { List, Action, ActionPanel } from "@raycast/api";
import { NewsItem } from "../get-latest-news";
import { formatTimeAgo } from "../utils/timeCalculator";
import { NodeHtmlMarkdown } from "node-html-markdown";

export default function NewsListDetail({ item }: { item: NewsItem }) {
  let markdown = `# ${item.title}\n\n`;
  markdown += NodeHtmlMarkdown.translate(item.description);

  return (
    <List.Item
      icon={"../assets/tv2_logo.png"}
      title={item.title}
      subtitle={formatTimeAgo(item.pubDate)}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={item.link} title={"View on Tv2.dk"} />
        </ActionPanel>
      }
    />
  );
}
