import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { authenticate, pocketbase } from "./pocketbase";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CollectionModel, RecordModel } from "pocketbase";
import { generateUrl } from "./utils";

export default function SearchCollections() {
  const { isLoading, data: collections } = useCachedPromise(
    async () => {
      await authenticate();
      const collections = await pocketbase.collections.getList();
      return collections.items;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search collections" isShowingDetail>
      <List.Section title={`${collections.length} collections`}>
        {collections.map((collection) => {
          const getCollectionIcon = (type: string) => {
            switch (type) {
              case "auth":
                return Icon.TwoPeople;
              case "base":
                return Icon.Folder;
              case "view":
                return Icon.Calendar;
            }
          };
          const markdown = ` ## Schema
| Name | Type |
|------|------|
${collection.schema.map((field) => `| ${field.name} | ${field.type} |`).join(`\n`)};
            `;
          return (
            <List.Item
              key={collection.id}
              icon={getCollectionIcon(collection.type)}
              title={collection.name}
              subtitle={collection.type}
              detail={<List.Item.Detail markdown={markdown} />}
              actions={
                isLoading ? undefined : (
                  <ActionPanel>
                    <Action.Push
                      icon={Icon.List}
                      title="View Records"
                      target={<ViewRecords collection={collection} />}
                    />
                  </ActionPanel>
                )
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function ViewRecords({ collection }: { collection: CollectionModel }) {
  const [records, setRecords] = useCachedState<RecordModel[]>("records", [], {
    cacheNamespace: `records-${collection.name}`,
  });
  const { isLoading, pagination } = usePromise(
    () => async (options: { page: number }) => {
      const records = await pocketbase.collection(collection.name).getList(options.page + 1, 20);
      return {
        data: records.items,
        hasMore: records.page < records.totalPages,
      };
    },
    [],
    {
      onData(data) {
        setRecords(data);
      },
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search records" pagination={pagination} isShowingDetail>
      <List.Section title={`Collections / ${collection.name}`} subtitle={`${records.length} records`}>
        {records.map((record) => {
          const url = generateUrl("collections", { collectionId: collection.id, recordId: record.id });
          return (
            <List.Item
              key={record.id}
              icon={Icon.Dot}
              title={record.id}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      {Object.entries(record).map(([key, val]: [key: string, val: string | number | boolean]) => (
                        <List.Item.Detail.Metadata.Label
                          key={key}
                          title={key}
                          text={val.toString() || ""}
                          icon={val ? undefined : Icon.Minus}
                        />
                      ))}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={url} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
