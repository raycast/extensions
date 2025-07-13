import { Color, environment, Grid, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { getNumberIcon, isEmpty } from "./utils/common-utils";
import { collectionTags } from "./utils/costants";
import { PexelsEmptyView } from "./components/pexels-empty-view";
import { columns, layout, rememberTag } from "./types/preferences";
import { ActionOnCollection } from "./components/action-on-collection";
import { useCollections } from "./hooks/useCollections";

export default function SearchCollections() {
  const [collectionTag, setCollectionTag] = useState<string>("1");
  const { data: collectionsData, isLoading, pagination } = useCollections(collectionTag);

  const collections = useMemo(() => {
    return collectionsData || [];
  }, [collectionsData]);
  return layout === "List" ? (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder={"Search collections"}
      searchBarAccessory={
        <List.Dropdown tooltip="Collection Tags" storeValue={rememberTag} onChange={setCollectionTag}>
          {collectionTags.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} icon={value.icon} />;
          })}
        </List.Dropdown>
      }
    >
      <PexelsEmptyView title={"No Collections"} />
      {collections?.map((collection) => {
        return (
          <List.Item
            id={collection.id + ""}
            key={collection.id + ""}
            icon={{ source: "collection-icon.png" }}
            title={collection.title}
            subtitle={isEmpty(collection.description) ? "" : collection.description + ""}
            accessories={[
              {
                icon: {
                  source: collection.photos_count > 99 ? Icon.Ellipsis : getNumberIcon(collection.photos_count),
                  tintColor: Color.SecondaryText,
                },
                tooltip: `${collection.photos_count} Photos`,
              },
            ]}
            actions={<ActionOnCollection collection={collection} />}
          />
        );
      })}
    </List>
  ) : (
    <Grid
      columns={parseInt(columns)}
      isLoading={isLoading}
      pagination={pagination}
      aspectRatio={"3/2"}
      fit={Grid.Fit.Fill}
      searchBarPlaceholder={"Search collections"}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Collection Tags" storeValue={rememberTag} onChange={setCollectionTag}>
          {collectionTags.map((value) => {
            return <Grid.Dropdown.Item key={value.value} title={value.title} value={value.value} icon={value.icon} />;
          })}
        </Grid.Dropdown>
      }
    >
      <PexelsEmptyView title={"No Collections"} />
      {collections?.map((collection) => {
        return (
          <Grid.Item
            id={collection.id + ""}
            key={collection.id + ""}
            content={{
              value: environment.appearance === "light" ? "collection-grid-icon.png" : "collection-grid-icon@dark.png",
              tooltip: isEmpty(collection.description) ? collection.title : collection.description + "",
            }}
            accessory={{
              icon: {
                source: collection.photos_count > 99 ? Icon.Ellipsis : getNumberIcon(collection.photos_count),
                tintColor: Color.SecondaryText,
              },
              tooltip: `${collection.photos_count} Photos`,
            }}
            title={collection.title}
            actions={<ActionOnCollection collection={collection} />}
          />
        );
      })}
    </Grid>
  );
}
