import {
  ActionPanel,
  CopyToClipboardAction,
  Detail,
  Icon,
  ImageMask,
  List,
  OpenInBrowserAction,
  PushAction,
} from "@raycast/api";
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

function getAccessoryTitle(item: VolumeItem) {
  return (
    (item?.volumeInfo?.averageRating ? "  ⭐  " + item.volumeInfo.averageRating + "/5" : "  ⭐  N/A") +
    (item.volumeInfo?.pageCount ? "  📄  " + item.volumeInfo.pageCount : "  📄  N/A")
  );
}

function convertInfoToMarkdown(item: VolumeItem) {
  return (
    "# " +
    item.volumeInfo?.title +
    "\n\n*" +
    (item.volumeInfo?.authors ? item.volumeInfo?.authors?.join(", ") : "") +
    "*\n\n ![thumbnail](" +
    (item.volumeInfo?.imageLinks?.thumbnail ? item.volumeInfo?.imageLinks?.thumbnail.replace("http", "https") : "") +
    ") \n\n**" +
    (item.volumeInfo?.subtitle ? item.volumeInfo?.subtitle : "") +
    "**\n\n" +
    // Chunk long text into paragraphs
    (item.volumeInfo?.description ? item.volumeInfo?.description?.replace(/(.*?\. ){3}/g, "$&\n\n") : "")
  );
}

function getMaskedImage(item: VolumeItem | undefined, catIndex: number) {
  return item?.volumeInfo?.imageLinks?.thumbnail
    ? {
        source: item.volumeInfo.imageLinks.thumbnail.replace("http", "https"),
        mask: ImageMask.RoundedRectangle,
      }
    : getIcon(catIndex);
}

function BookDetail({ item }: { item: VolumeItem }) {
  return (
    <Detail
      actions={
        <ActionPanel>
          <OpenInBrowserAction icon={Icon.Globe} url={item.volumeInfo.infoLink} />
          <CopyToClipboardAction
            title="Copy URL to Clipboard"
            icon={Icon.Clipboard}
            content={item.volumeInfo.infoLink}
          />
        </ActionPanel>
      }
      navigationTitle={item.volumeInfo.title}
      markdown={convertInfoToMarkdown(item)}
    />
  );
}

export default function SearchGoogleBooks() {
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
                  icon={getMaskedImage(item, catIndex)}
                  title={item.volumeInfo.title}
                  subtitle={item?.volumeInfo?.authors ? item.volumeInfo.authors[0] : "Various Authors"}
                  accessoryTitle={getAccessoryTitle(item)}
                  actions={
                    <ActionPanel>
                      <PushAction icon={Icon.List} title="Show Book Details" target={<BookDetail item={item} />} />
                      <OpenInBrowserAction icon={Icon.Globe} url={item.volumeInfo.infoLink} />
                      <CopyToClipboardAction
                        title="Copy URL to Clipboard"
                        icon={Icon.Clipboard}
                        content={item.volumeInfo.infoLink}
                      />
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
