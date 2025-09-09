import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { sdk, SDKContext } from "./sdk";
import { useContext } from "react";

export default function Databases() {
  const sdks = useContext(SDKContext);
  const { isLoading, data: databases } = useCachedPromise(
    async () => {
      const res = await sdks.databases.list();
      return res.databases;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by name or ID">
      {!isLoading && !databases.length ? (
        <List.EmptyView title="Create a database to get started." />
      ) : (
        databases.map((database) => (
          <List.Item
            key={database.$id}
            keywords={[database.$id]}
            icon={Icon.Coin}
            title={database.name}
            accessories={[
              { icon: Icon.Plus, date: new Date(database.$createdAt), tooltip: `Created: ${database.$createdAt}` },
              { icon: Icon.Pencil, date: new Date(database.$updatedAt), tooltip: `Updated: ${database.$updatedAt}` },
            ]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Box} title="Collections" target={<Collections databaseId={database.$id} />} />
                <Action.CopyToClipboard title="Copy ID to Clipboard" content={database.$id} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function Collections({ databaseId }: { databaseId: string }) {
  const { databases } = useContext(SDKContext);
  const { isLoading, data: collections } = useCachedPromise(
    async () => {
      const res = await databases.listCollections(databaseId);
      return res.collections;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {collections.map((collection) => (
        <List.Item
          key={collection.$id}
          icon={Icon.Box}
          title={collection.name}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Document} title="Documents" target={<Documents collection={collection} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Documents({ collection }: { collection: sdk.Models.Collection }) {
  const { databases } = useContext(SDKContext);
  const { isLoading, data: documents } = useCachedPromise(
    async () => {
      const res = await databases.listDocuments(collection.databaseId, collection.$id);
      return res.documents;
    },
    [],
    {
      initialData: [],
    },
  );
  return (
    <List isLoading={isLoading}>
      {!isLoading && !documents.length ? (
        <List.EmptyView
          title="Create your first document"
          description="Need a hand? Learn more in our documentation."
        />
      ) : (
        documents.map((document) => <List.Item key={document.$id} icon={Icon.Document} title={document.$id} />)
      )}
    </List>
  );
}
