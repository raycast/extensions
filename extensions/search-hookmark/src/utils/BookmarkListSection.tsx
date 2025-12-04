import { Bookmark } from "./type";
import React from "react";
import { List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

const hasImageFileExtension = (path: string) =>
  path.endsWith(".pdf") || path.endsWith(".jpg") || path.endsWith(".jpeg") || path.endsWith(".png");

export default function BookmarkListSection({
  title,
  bookmarks,
  renderActions,
  isFileSection = false,
}: {
  title: string;
  bookmarks: Bookmark[];
  renderActions: (bookmark: Bookmark) => React.ReactNode;
  isFileSection?: boolean;
}) {
  return (
    <List.Section title={title} subtitle={`${bookmarks.length} bookmarks`}>
      {bookmarks.map((bookmark) => (
        <List.Item
          title={bookmark.title}
          key={bookmark.address}
          icon={isFileSection ? { fileIcon: bookmark.path } : getFavicon(bookmark.address)}
          detail={
            <List.Item.Detail
              isLoading={false}
              markdown={
                isFileSection && hasImageFileExtension(bookmark.path)
                  ? `<img src="${encodeURIComponent(bookmark.path)}" alt="${bookmark.title}" height="190" />`
                  : isFileSection
                  ? undefined
                  : `[${bookmark.title}](${bookmark.address})`
              }
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Title"
                    text={bookmark.title}
                    icon={isFileSection ? { fileIcon: bookmark.path } : getFavicon(bookmark.address)}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link title="Address" text={bookmark.address} target={bookmark.address} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Path" text={bookmark.path} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={renderActions(bookmark)}
        />
      ))}
    </List.Section>
  );
}
