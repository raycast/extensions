import { Action, ActionPanel, List } from "@raycast/api";

import { NodeHtmlMarkdown } from "node-html-markdown";

import { NewsItem } from "@/types";
import { formatTimeAgo } from "@/utils";

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
