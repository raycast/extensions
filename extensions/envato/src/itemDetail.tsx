import { List } from "@raycast/api";
import { Item, SearchItem } from "envato";
import { NodeHtmlMarkdown } from "node-html-markdown";

export function ItemDetail({ item }: { item: SearchItem | Item }) {
  const markdown = `## Description \n\n --- \n ${NodeHtmlMarkdown.translate(item.description)}`;
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="ID" text={item.id.toString()} />
          <List.Item.Detail.Metadata.Label title="Name" text={item.name} />
          <List.Item.Detail.Metadata.Link title="Author" text={item.author_username} target={item.author_url} />
          <List.Item.Detail.Metadata.Link title="URL" text={item.url} target={item.url} />
          <List.Item.Detail.Metadata.Link title="Site" text={item.site} target={`https://${item.site}`} />
          <List.Item.Detail.Metadata.TagList title="Tags">
            {item.tags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}
