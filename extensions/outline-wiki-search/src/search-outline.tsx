import { List, ActionPanel, Action, showToast, Toast, getPreferenceValues, Icon, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { useSearchDocuments, SearchResponseItem, Collection, useFetchCollections } from "./api/outline";

export default function SearchOutline() {
  const [searchText, setSearchText] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const { outlineUrl } = getPreferenceValues<{ outlineUrl: string }>();

  const { data: collectionsData, error: collectionsError } = useFetchCollections();
  const { data, isLoading, error } = useSearchDocuments(searchText, selectedCollection?.id || null, collectionsData, {
    execute: searchText.trim().length > 0,
  });

  useEffect(() => {
    if (collectionsError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch collections",
        message: collectionsError.message,
      });
    }
  }, [collectionsError]);

  if (error && searchText.trim().length > 0) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to search documents",
      message: error.message,
    });
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Outline documents..."
      throttle
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Collection"
          storeValue={true}
          onChange={(id) => setSelectedCollection(collectionsData?.data.find((c) => c.id === id) || null)}
        >
          <List.Dropdown.Item key="all" title="All Collections" value="" />
          {collectionsData?.data.map((collection) => (
            <List.Dropdown.Item
              key={collection.id}
              title={collection.name}
              value={collection.id}
              icon={{ source: Icon.Circle, tintColor: collection.color }}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Search Results">
        {data?.data.map((item: SearchResponseItem) => (
          <List.Item
            key={item.document.id}
            title={item.document.title || "Untitled Document"}
            detail={
              <List.Item.Detail
                markdown={item.document.text}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Title" text={item.document.title} />
                    <List.Item.Detail.Metadata.Label
                      title="Collection"
                      text={item.document.collectionName || "Unknown Collection"}
                    />
                    <List.Item.Detail.Metadata.Link
                      title="Open in Browser"
                      target={`${outlineUrl}${item.document.url}`}
                      text="Open"
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={`${new Date(item.document.createdAt).toLocaleDateString()} by ${item.document.createdBy.name}`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Last Modified"
                      text={`${new Date(item.document.updatedAt).toLocaleDateString()} by ${item.document.updatedBy.name}`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Document"
                  target={
                    <Detail
                      markdown={item.document.text}
                      metadata={
                        <Detail.Metadata>
                          <Detail.Metadata.Label title="Title" text={item.document.title} />
                          <Detail.Metadata.Label
                            title="Collection"
                            text={item.document.collectionName || "Unknown Collection"}
                          />
                          <Detail.Metadata.Link
                            title="Open in Browser"
                            target={`${outlineUrl}${item.document.url}`}
                            text="Open"
                          />
                          <Detail.Metadata.Separator />
                          <Detail.Metadata.Label
                            title="Created"
                            text={`${new Date(item.document.createdAt).toLocaleDateString()} by ${item.document.createdBy.name}`}
                          />
                          <Detail.Metadata.Label
                            title="Last Modified"
                            text={`${new Date(item.document.updatedAt).toLocaleDateString()} by ${item.document.updatedBy.name}`}
                          />
                        </Detail.Metadata>
                      }
                    />
                  }
                />
                <Action.OpenInBrowser url={`${outlineUrl}${item.document.url}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
