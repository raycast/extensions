import { ActionPanel, Detail, List, Action, getPreferenceValues, Icon } from "@raycast/api";
// import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getBookmarks } from "./hookmark";
import { Bookmark } from "./type";

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const data: Bookmark[] = getBookmarks();

  return (
    <List isLoading={isLoading}>
      {data.map((bookmark: Bookmark) => (
        <List.Item
          title={bookmark.title}
          key={bookmark.address}
          icon="command-Icon.png"
          accessories={[{ text: bookmark.address }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={bookmark.address} />
              <Action.Open title="Open File" target={bookmark.path} />
              <Action.CopyToClipboard
                title="Copy As File URL"
                content={bookmark.address}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />
              <Action.CopyToClipboard
                title="Copy As Path"
                content={bookmark.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.Paste
                title="Paste Address"
                content={bookmark.address}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
