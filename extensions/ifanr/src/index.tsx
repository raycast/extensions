import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import Parser from "rss-parser";
import { getIcon } from "./utils";
import { IListItem } from "./type";

export default function Command() {
  const { isLoading, data } = useFetch("https://www.ifanr.com/feed", {
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = await response.text();
      if (data !== undefined) {
        const parser: Parser = new Parser();
        const feed = await parser.parseString(data as string);

        return { items: feed.items as IListItem[] };
      }
      return { items: [] };
    },
  });

  return (
    <List isLoading={isLoading}>
      {data?.items.map((item, index) => (
        <List.Item
          icon={getIcon(index + 1)}
          key={index}
          title={item.title}
          accessories={[{ text: item.creator, icon: Icon.Person }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.link} />
              <Action.CopyToClipboard content={item.link} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
