import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useAsync } from "react-use";
import { Instance } from "./queryInstances";
import queryCollection, { Collection } from "./queryCollection";
import OutlineDocument from "./OutlineDocument";

const Document = ({ document, instance }: { document: OutlineDocument; instance: Instance }) => {
  const [collection, setCollection] = useState<Collection | undefined>(undefined);

  useAsync(async () => {
    setCollection(await queryCollection(instance, document.collectionId));
  }, [document.collectionId, instance]);

  return (
    <List.Item
      accessories={[
        {
          icon: Icon.Person,
          tag: document.collaboratorIds.length.toString(),
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={document.url} title="Open Document in Outline" />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={document.text}
          metadata={
            <List.Item.Detail.Metadata>
              {collection && <List.Item.Detail.Metadata.Label text={collection.name} title="Collection" />}
              <List.Item.Detail.Metadata.Label text={document.createdBy.name} title="Author" />
              <List.Item.Detail.Metadata.Label
                text={new Date(document.createdAt).toLocaleDateString()}
                title="Created At"
              />
              <List.Item.Detail.Metadata.Label
                text={new Date(document.updatedAt).toLocaleDateString()}
                title="Updated At"
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      icon={document.emoji}
      key={document.id}
      title={document.title}
    />
  );
};

export default Document;
