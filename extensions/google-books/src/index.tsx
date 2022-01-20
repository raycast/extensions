import { ActionPanel, CopyToClipboardAction, Detail, Icon, List, OpenInBrowserAction, PushAction } from "@raycast/api";
import { useSearch } from "./hooks/useSearch";
import { useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { items, loading } = useSearch(searchText);

  return (
    <List
      throttle
      navigationTitle="Search Google Books by keywords..."
      isLoading={loading}
      onSearchTextChange={setSearchText}
    >
      {items?.map((item) => (
        <List.Item
          key={item.id}
          icon={Icon.Document}
          title={item.volumeInfo.title}
          subtitle={item.volumeInfo?.categories?.join(", ") ?? ""}
          accessoryTitle={
            item.volumeInfo.authors?.slice(0, 1).join(", ") +
            " ⭐ " +
            (item.volumeInfo.averageRating ?? "?") +
            "/10" +
            " 📄 " +
            (item.volumeInfo.pageCount ?? "?")
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
                    markdown={`${item?.volumeInfo?.subtitle ?? "" + "\n\n"} ${item?.volumeInfo?.description ?? ""}`}
                  />
                }
              />
              <OpenInBrowserAction icon={Icon.Globe} url={item.volumeInfo.infoLink} />
              <CopyToClipboardAction icon={Icon.Clipboard} content={item.volumeInfo.infoLink} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
