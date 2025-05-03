import { Icon, List } from "@raycast/api";
import { Item, SearchItem } from "envato";
import { NodeHtmlMarkdown } from "node-html-markdown";

export function ItemDetail({ item }: { item: SearchItem | Item }) {
  const markdown = `## Description \n\n --- \n ${NodeHtmlMarkdown.translate(
    item.description_html ?? item.description
  )}`;
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="ID" text={item.id.toString()} />
          <List.Item.Detail.Metadata.Label title="Name" text={item.name} />
          <List.Item.Detail.Metadata.Link title="Author" text={item.author_username} target={item.author_url} />
          <List.Item.Detail.Metadata.Link title="URL" text={item.url.split("/item/")[1]} target={item.url} />
          <List.Item.Detail.Metadata.Link title="Site" text={item.site} target={`https://${item.site}`} />
          <List.Item.Detail.Metadata.Link
            title="Classification"
            text={item.classification}
            target={item.classification_url}
          />
          <List.Item.Detail.Metadata.TagList title="Tags">
            {item.tags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="ATTRIBUTES" />
          {item.attributes.map(({ name, label, value }) => {
            const title = label || name;
            if (!value) return <List.Item.Detail.Metadata.Label key={name} title={title} icon={Icon.Minus} />;
            if (value === "Yes" || value === "No")
              return (
                <List.Item.Detail.Metadata.Label
                  key={name}
                  title={title}
                  icon={value === "Yes" ? Icon.Check : Icon.Xmark}
                />
              );
            if (value instanceof Array)
              return (
                <List.Item.Detail.Metadata.TagList key={name} title={title}>
                  {value.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              );
            if (value.startsWith("http"))
              return <List.Item.Detail.Metadata.Link key={name} title={title} text={value} target={value} />;
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
