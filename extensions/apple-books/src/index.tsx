import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { useState } from "react";
import { NodeHtmlMarkdown } from "node-html-markdown";

export default function SearchBooks() {
  const [term, setTerm] = useState("");
  const [media, setMedia] = useState("ebook");
  const [showDetail] = useCachedState("show-detail", true);

  const { data, isLoading } = useFetch<string>(`https://itunes.apple.com/search?term=${term}&media=${media}&limit=20`);

  const books = (data ? JSON.parse(data)?.results : []) ?? [];

  return (
    <List
      throttle
      isShowingDetail={!!term && showDetail}
      isLoading={isLoading}
      onSearchTextChange={setTerm}
      searchBarPlaceholder={`Search ${media === "ebook" ? "books" : "audiobooks"} by title...`}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" storeValue defaultValue={media} onChange={setMedia}>
          <List.Dropdown.Item icon={Icon.Book} title="Books" value="ebook" />
          <List.Dropdown.Item icon={Icon.Headphones} title="Audiobooks" value="audiobook" />
        </List.Dropdown>
      }
    >
      {!term && books.length === 0 && <List.EmptyView title="Search for books" icon="empty.png" />}
      {books
        ?.filter((item: any) => !!item)
        .map((item: any) => (
          <BookItem key={item.trackId ?? item.collectionId} item={item} />
        ))}
    </List>
  );
}

function formatPrice(item: { formattedPrice?: string; collectionPrice?: number; currency: string }) {
  if (item.formattedPrice === "Free") {
    return item.formattedPrice;
  }

  if (item.formattedPrice) {
    return item.formattedPrice?.toString();
  }

  if (item.collectionPrice !== null && item.collectionPrice !== undefined) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: item.currency,
    }).format(item.collectionPrice);
  }

  return "";
}

function BookItem({ item }: { item: any }) {
  const [showDetail, setShowDetail] = useCachedState("show-detail", true);
  const isAudioBook = item.wrapperType === "audiobook";
  const description = NodeHtmlMarkdown.translate(item.description);
  const price = formatPrice(item);

  return (
    <List.Item
      icon={{ source: item.artworkUrl100 }}
      title={item.trackName ?? item.collectionName}
      subtitle={showDetail ? "" : price}
      accessories={[{ text: showDetail ? "" : item.artistName, icon: showDetail ? null : Icon.Person }]}
      detail={
        <List.Item.Detail
          markdown={`![](${item.artworkUrl100})\n\n${description}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Type"
                text={isAudioBook ? "Audiobook" : "Book"}
                icon={isAudioBook ? Icon.Headphones : Icon.Book}
              />
              {item.artistName && (
                <List.Item.Detail.Metadata.Link title="Author" text={item.artistName} target={item.artistViewUrl} />
              )}
              <List.Item.Detail.Metadata.Label title="Price" text={price} />
              {item.averageUserRating && (
                <List.Item.Detail.Metadata.Label title="Rating" text={`${item.averageUserRating.toString()}/5`} />
              )}
              {item.releaseDate && (
                <List.Item.Detail.Metadata.Label
                  title="Release Date"
                  text={new Date(item.releaseDate).toLocaleDateString()}
                />
              )}
              {item.trackCount && (
                <List.Item.Detail.Metadata.Label title="# of Tracks" text={item.trackCount.toString()} />
              )}
              {item.primaryGenreName && <List.Item.Detail.Metadata.Label title="Genre" text={item.primaryGenreName} />}
              {item.genres && (
                <List.Item.Detail.Metadata.TagList title="Genres">
                  {item.genres.map((genre: any) => (
                    <List.Item.Detail.Metadata.TagList.Item key={genre} text={genre} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Book" url={item.trackViewUrl ?? item.collectionViewUrl} />
            <Action.OpenInBrowser title="Open Artist" url={item.artistViewUrl} />
            <Action
              icon={Icon.AppWindowSidebarLeft}
              title="Toggle Detail"
              onAction={() => setShowDetail(!showDetail)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd"], key: "." }}
              title="Copy URL"
              content={item.trackViewUrl}
            />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd"], key: "," }}
              title="Copy Title"
              content={item.title}
            />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              title="Copy Description"
              content={description}
            />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["ctrl", "shift"], key: "." }}
              title="Copy Image URL"
              content={item.artworkUrl100}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
