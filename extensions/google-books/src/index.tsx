import { ActionPanel, CopyToClipboardAction, Detail, Icon, List, OpenInBrowserAction, PushAction } from "@raycast/api";
import { useSearch } from "./hooks/useSearch";
import { useState } from "react";
import { VolumeItem } from "./types/google-books.dt";

const iconToEmojiMap = new Map<number, string>([
  [0, "📘"],
  [1, "📕"],
  [2, "📗"],
  [3, "📓"],
  [4, "📔"],
  [5, "📙"],
]);

function getIcon(index: number) {
  return iconToEmojiMap.get(index % 5);
}

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { items, loading } = useSearch(searchText);

  const categorisedItems = items?.reduce((acc: Record<string, VolumeItem[]>, item: VolumeItem) => {
    const category = item.volumeInfo?.categories ? item.volumeInfo?.categories[0] : "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  return (
    <List
      throttle
      searchBarPlaceholder="Search Google Books by keywords..."
      navigationTitle="Search Google Books"
      isLoading={loading}
      onSearchTextChange={setSearchText}
    >
      {categorisedItems
        ? Object.keys(categorisedItems)?.map((category, catIndex) => (
            <List.Section
              key={category}
              title={category}
              subtitle={`📚 Total Books: ${categorisedItems[category].length}`}
            >
              {categorisedItems[category]?.map((item) => (
                <List.Item
                  key={item.id}
                  icon={item?.volumeInfo.printType === "BOOK" ? getIcon(catIndex) : "📑"}
                  title={item.volumeInfo.title}
                  subtitle={item?.volumeInfo?.authors ? item.volumeInfo.authors[0] : "Various Authors"}
                  accessoryTitle={
                    (item?.volumeInfo?.averageRating ? "  ⭐  " + item.volumeInfo.averageRating + "/5" : "  ⭐  N/A") +
                    (item.volumeInfo?.pageCount ? "  📄  " + item.volumeInfo.pageCount : "  📄  N/A")
                  }
                  actions={
                    <ActionPanel>
                      <PushAction
                        title="Show Book Details"
                        target={
                          <Detail
                            actions={
                              <ActionPanel>
                                <OpenInBrowserAction icon={Icon.Globe} url={item.volumeInfo.infoLink} />
                                <CopyToClipboardAction icon={Icon.Clipboard} content={item.volumeInfo.infoLink} />
                              </ActionPanel>
                            }
                            navigationTitle={item.volumeInfo.title}
                            markdown={`${item?.volumeInfo?.subtitle ?? "" + "\n\n"} ${
                              item?.volumeInfo?.description ?? ""
                            }`}
                          />
                        }
                      />
                      <OpenInBrowserAction icon={Icon.Globe} url={item.volumeInfo.infoLink} />
                      <CopyToClipboardAction icon={Icon.Clipboard} content={item.volumeInfo.infoLink} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ))
        : null}
    </List>
  );
}
