import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { Webflow } from "webflow-api";
import { draftCMSItem, publishCMSItem } from "../webflow/client";

export default function CollectionItemListItem(props: {
  slug: string;
  staging: string;
  collectionId: string;
  item: Webflow.CollectionItem;
}) {
  const { slug, staging, collectionId, item } = props;

  const name = item.fieldData?.name ?? "Untitled Item";
  const id = item.id;

  return (
    <List.Item
      title={name}
      subtitle={id}
      icon={{ source: Icon.Cd }}
      actions={
        <ActionPanel title={name}>
          <Action
            title="Open in Webflow"
            icon={Icon.Link}
            onAction={() => {
              const url = `https://${staging}.webflow.io/${slug}/${item.fieldData?.slug}`;
              open(url);
            }}
          />
          <Action
            title="Publish Item"
            icon={Icon.Upload}
            onAction={() => {
              publishCMSItem(collectionId, item.id);
            }}
          />
          <Action
            title="Draft Item"
            icon={Icon.Tray}
            onAction={() => {
              draftCMSItem(collectionId, item.id);
            }}
          />
        </ActionPanel>
      }
    />
  );
}
