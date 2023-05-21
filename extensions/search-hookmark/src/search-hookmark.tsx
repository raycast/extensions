import { ActionPanel, List, Action, Image } from "@raycast/api";
import { useCachedPromise, getFavicon } from "@raycast/utils";
import { getBookmarks, getNumberOfBookmarks } from "./hookmark";

export default function Command() {
  const { data, isLoading } = useCachedPromise(getBookmarks);

  return (
    <List isLoading={isLoading}>
      <List.Section title={`Results:`} subtitle={getNumberOfBookmarks(data)}>
        {data?.map((bookmark) => (
          <List.Item
            title={bookmark.title}
            key={bookmark.address}
            icon={getFavicon(bookmark.address, { mask: Image.Mask.RoundedRectangle })}
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
      </List.Section>
    </List>
  );
}
