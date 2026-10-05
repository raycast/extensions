import { Action, ActionPanel, Form, Grid, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import type { Playlist } from "@kud/qobuz";
import { appLink, BRAND, deepLink, getClient } from "./lib/client";
import { PlaylistTracks } from "./lib/details";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(
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
    <Grid
      columns={4}
      aspectRatio="1"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      searchBarPlaceholder="Filter playlists…"
    >
      {(data ?? []).map((playlist) => {
        const web = deepLink.playlist(playlist.id);
        return (
          <Grid.Item
            key={playlist.id}
            content={{
              value: playlist.image ?? { source: Icon.Music, tintColor: BRAND },
              tooltip: playlist.description || playlist.name,
            }}
            title={playlist.name}
            subtitle={playlist.description || `${playlist.tracksCount ?? 0} tracks`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Tracks"
                  icon={Icon.AppWindowList}
                  target={<PlaylistTracks playlist={playlist} />}
                />
                <Action.Open title="Open in Qobuz" target={appLink.playlist(playlist.id)} icon={Icon.Music} />
                <Action.OpenInBrowser title="Open in Browser" url={web} />
                <Action.Push
                  title="Edit Description"
                  icon={Icon.Pencil}
                  target={<EditDescription playlist={playlist} onSaved={revalidate} />}
                />
                <Action.CopyToClipboard title="Copy Share Link" content={web} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}

function EditDescription({ playlist, onSaved }: { playlist: Playlist; onSaved: () => void }) {
  const { pop } = useNavigation();

  const submit = async (values: { description: string }) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving description…",
    });
    try {
      const client = await getClient();
      await client.playlists.update(playlist.id, {
        description: values.description,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Description updated";
      onSaved();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't update description" });
    }
  };

  return (
    <Form
      navigationTitle={`Edit — ${playlist.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Description" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Describe this playlist…"
        defaultValue={playlist.description ?? ""}
      />
    </Form>
  );
}
