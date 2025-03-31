import { List, Action, ActionPanel } from "@raycast/api";
import { NewsItem } from "../types/news";
import { formatTimeAgo } from "../utils/timeCalculator";
import { NodeHtmlMarkdown } from "node-html-markdown";

export default function NewsListDetail({ item }: { item: NewsItem }) {
  let markdown = `# ${item.title}\n\n`;
  markdown += NodeHtmlMarkdown.translate(item.description);

  return (
    <List.Item
      icon={"../assets/nasa_logo.png"}
      title={item.title}
      subtitle={formatTimeAgo(item.pubDate)}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={item.link} title={"View on Nasa.gov"} />
        </ActionPanel>
      }
    />
  );
}
