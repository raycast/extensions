import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { appLink, BRAND, deepLink, getClient } from "./lib/client";

export default function Command() {
  const { data, isLoading } = useCachedPromise(
    async () => {
      const client = await getClient();
      return client.playlists.listForUser();
    },
    [],
    {
      onError: (error) => {
        showFailureToast(error, { title: "Couldn't load playlists" });
      },
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter playlists…">
      {(data ?? []).map((playlist) => {
        const web = deepLink.playlist(playlist.id);
        return (
          <List.Item
            key={playlist.id}
            icon={{ source: Icon.Music, tintColor: BRAND }}
            title={playlist.name}
            subtitle={playlist.description ?? ""}
            accessories={[{ text: `${playlist.tracksCount ?? 0} tracks` }]}
            actions={
              <ActionPanel>
                <Action.Open
                  title="Open in Qobuz"
                  target={appLink.playlist(playlist.id)}
                  icon={Icon.Music}
                />
                <Action.OpenInBrowser title="Open in Browser" url={web} />
                <Action.CopyToClipboard title="Copy Share Link" content={web} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
