import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Instance } from "./queryInstances";
import OutlineDocument from "./OutlineDocument";
import { useFetch } from "@raycast/utils";

export interface Collection {
  icon: string;
  name: string;
}

export interface CollectionResponse {
  data: Collection;
}

const Document = ({ document, instance }: { document: OutlineDocument; instance: Instance }) => {
  const { data: collection } = useFetch<CollectionResponse, never, Collection>(`${instance.url}/api/collections.info`, {
    body: JSON.stringify({
      id: document.collectionId,
    }),
    headers: { Authorization: `Bearer ${instance.apiKey}`, "Content-Type": "application/json" },
    method: "POST",
  });

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
