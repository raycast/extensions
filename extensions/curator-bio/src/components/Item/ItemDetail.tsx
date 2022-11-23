import { Detail, ActionPanel, Action, List, Icon } from "@raycast/api";
import { Item } from "../../lib/types";
import { toCapitalize } from "../../lib/utils";
import { useItemRenderData } from "./hooks";

export const ItemDetail = ({ item }: { item: Item }) => {
  const { markdown, link } = useItemRenderData(item);

  return (
    <Detail
      markdown={markdown}
      actions={<ActionPanel>{link && <Action.OpenInBrowser url={link} title="Open in Browser" />}</ActionPanel>}
      metadata={<ItemDetailMetadata item={item} />}
    />
  );
};

export const ItemListDetail = ({ item }: { item: Item }) => {
  const { markdown, link } = useItemRenderData(item);

  return (
    <List.Item
      key={item.id}
      title={item.title}
      subtitle={item.subtitle}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" target={<ItemDetail item={item} />} icon={Icon.Sidebar} />
          {link && <Action.OpenInBrowser title="Open in Browser" url={link} />}
        </ActionPanel>
      }
      detail={<List.Item.Detail markdown={markdown} />}
    />
  );
};

export const ItemDetailMetadata = ({ item }: { item: Item }) => {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.TagList title="Collections">
        {item.collections.map((collection) => (
          <List.Item.Detail.Metadata.TagList.Item key={collection.id} text={`${collection.icon} ${collection.name}`} />
        ))}
      </List.Item.Detail.Metadata.TagList>

      {item.tags.length > 0 && (
        <List.Item.Detail.Metadata.TagList title="Tags">
          {item.tags.map((tag) => (
            <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}

      <List.Item.Detail.Metadata.Label title="Information" />

      {item.views && <List.Item.Detail.Metadata.Label title="Visits" text={item.views.toString()} />}

      <List.Item.Detail.Metadata.Label title="Status" text={toCapitalize(item.status)} />

      <List.Item.Detail.Metadata.Label title="Created" text={new Date(item.createdAt).toLocaleString()} />

      <List.Item.Detail.Metadata.Label title="Updated" text={new Date(item.updatedAt).toLocaleString()} />
    </List.Item.Detail.Metadata>
  );
};
