import { Detail, ActionPanel, Action, List, Icon, Image } from "@raycast/api";
import { Item } from "../../lib/types";
import { getItemUserWorkaround } from "../../lib/utils";
import Collection from "../Collection";
import UserView from "../UserView";
import { useItemRenderData } from "./hooks";
import capitalize from "lodash/capitalize";

type CollectionInfo = {
  userId: string;
  collectionId: string;
};

const OpenCollectionAction = ({ item }: { item: Item }) => {
  const user = getItemUserWorkaround(item);
  return (
    <ActionPanel.Submenu
      title="Open Collection..."
      icon={Icon.List}
      shortcut={{
        modifiers: ["cmd", "shift"],
        key: "c",
      }}
    >
      {item.collections.map((collection) => {
        return (
          <Action.Push
            key={collection.id}
            title={collection.name}
            icon={Icon.Folder}
            target={
              <Collection
                userId={user.customId || user.custom_id}
                collectionId={collection.customId || collection.id.slice(0, 8)}
                user={user}
              />
            }
          />
        );
      })}
    </ActionPanel.Submenu>
  );
};

export const ItemDetail = ({ item }: { item: Item }) => {
  const { markdown, link } = useItemRenderData(item);
  const user = getItemUserWorkaround(item);

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {link && <Action.OpenInBrowser url={link} title="Open in Browser" />}

          <ActionPanel.Section>
            <OpenCollectionAction item={item} />
          </ActionPanel.Section>

          <Action.Push
            title="Browse User"
            icon={Icon.PersonCircle}
            target={<UserView user={user} />}
            shortcut={{
              modifiers: ["cmd", "shift"],
              key: "u",
            }}
          />
        </ActionPanel>
      }
      metadata={<ItemDetailMetadata item={item} />}
    />
  );
};

export const ItemListDetail = ({ item, collectionInfo }: { item: Item; collectionInfo?: CollectionInfo }) => {
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

          <ActionPanel.Section>
            {item.user.customId && <OpenCollectionAction item={item} />}

            {collectionInfo && (
              <Action.OpenInBrowser
                title="Open in Collection in Browser"
                url={`https://www.curator.bio/${collectionInfo.userId}/${collectionInfo.collectionId}`}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
      detail={<List.Item.Detail markdown={markdown} />}
    />
  );
};

export const ItemDetailMetadata = ({ item }: { item: Item }) => {
  const user = getItemUserWorkaround(item);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="User"
        text={user.name}
        icon={{
          source: user.avatar,
          mask: Image.Mask.Circle,
        }}
      />

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

      <List.Item.Detail.Metadata.Separator />

      {item.views && <List.Item.Detail.Metadata.Label title="Visits" text={item.views.toString()} />}

      <List.Item.Detail.Metadata.Label title="Status" text={capitalize(item.status)} />

      <List.Item.Detail.Metadata.Label title="Created" text={new Date(item.createdAt).toLocaleString()} />

      <List.Item.Detail.Metadata.Label title="Updated" text={new Date(item.updatedAt).toLocaleString()} />
    </List.Item.Detail.Metadata>
  );
};
