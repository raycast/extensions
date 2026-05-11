import React from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Form,
  confirmAlert,
  Alert,
  useNavigation,
  Detail,
  Clipboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  listPlaylists,
  deletePlaylist,
  createPlaylist,
  updatePlaylist,
  RateLimitError,
  MissingApiKeyError,
} from "./api";
import type {
  Playlist,
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
} from "./types";
import BrowseVideos from "./browse-videos";
import {
  ErrorDetail,
  RateLimitErrorDetail,
  MissingApiKeyDetail,
} from "./components";

export default function BrowsePlaylists() {
  const [visibility, setVisibility] = useState<"personal" | "org">("personal");
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (vis: "personal" | "org") => {
      const response = await listPlaylists({ visibility: vis, limit: 100 });
      return response.playlists;
    },
    [visibility],
    {
      onError: (err: Error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load playlists",
          message: err.message,
        });
      },
    },
  );

  const filteredPlaylists = data?.filter((playlist) => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      playlist.name.toLowerCase().includes(search) ||
      playlist.description.toLowerCase().includes(search)
    );
  });

  if (error) {
    // Handle missing API key with onboarding
    if (error instanceof MissingApiKeyError) {
      return <MissingApiKeyDetail />;
    }

    // Handle rate limit errors with a better UI
    if (error instanceof RateLimitError) {
      return <RateLimitErrorDetail error={error} onRetry={revalidate} />;
    }

    // Handle other errors with debug info
    const debugInfo = {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      command: "Browse Playlists",
      visibility,
    };
    const debugText = JSON.stringify(debugInfo, null, 2);

    return (
      <Detail
        markdown={`# Error\n\n${error.message}\n\n## Debug Info\n\n\`\`\`json\n${debugText}\n\`\`\`\n\nPress **Enter** to copy debug info.`}
        actions={
          <ActionPanel>
            <Action
              title="Copy Debug Info"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(debugText);
                showToast({
                  style: Toast.Style.Success,
                  title: "Debug info copied",
                });
              }}
              shortcut={{ modifiers: [], key: "enter" }}
            />
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search playlists..."
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by visibility"
          value={visibility}
          onChange={(newValue) => setVisibility(newValue as "personal" | "org")}
        >
          <List.Dropdown.Item title="Personal" value="personal" />
          <List.Dropdown.Item title="Organization" value="org" />
        </List.Dropdown>
      }
    >
      {!searchText && (
        <List.Section title="Quick Access">
          <List.Item
            title="My Videos"
            subtitle="Browse all your videos"
            icon={Icon.Video}
            accessories={[
              {
                icon: Icon.Globe,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url="https://www.tella.tv/videos"
                  title="Open My Videos"
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {filteredPlaylists && filteredPlaylists.length > 0 && (
        <List.Section title={searchText ? "Search Results" : "Playlists"}>
          {filteredPlaylists.map((playlist) => (
            <PlaylistItem
              key={playlist.id}
              playlist={playlist}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}
      {filteredPlaylists?.length === 0 && data && data.length > 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matches"
          description="Try a different search term"
        />
      )}
      {filteredPlaylists?.length === 0 &&
        (!data || data.length === 0) &&
        !searchText && (
          <List.EmptyView
            icon={Icon.Folder}
            title="No Playlists"
            description="No playlists found"
          />
        )}
    </List>
  );
}

function PlaylistItem({
  playlist,
  onRefresh,
}: {
  playlist: Playlist;
  onRefresh: () => void;
}) {
  const { push } = useNavigation();

  return (
    <List.Item
      title={playlist.name}
      subtitle={playlist.description}
      icon={playlist.emoji ? { source: playlist.emoji } : Icon.Folder}
      accessories={[
        {
          text: `${playlist.videos} video${playlist.videos !== 1 ? "s" : ""}`,
          icon: Icon.Video,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Browse Videos"
              icon={Icon.List}
              target={
                <BrowseVideos
                  playlistId={playlist.id}
                  playlistName={playlist.name}
                />
              }
            />
            <Action.OpenInBrowser
              url={playlist.links.viewPage}
              title="Open in Browser"
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Create New Playlist"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() =>
                push(<CreatePlaylistForm onSuccess={onRefresh} />)
              }
            />
            <Action
              title="Rename Playlist"
              icon={Icon.Pencil}
              onAction={() =>
                push(
                  <UpdatePlaylistForm
                    playlist={playlist}
                    onSuccess={onRefresh}
                  />,
                )
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete Playlist"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Delete Playlist",
                    message: `Are you sure you want to delete "${playlist.name}"? Videos in the playlist will not be deleted.`,
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  })
                ) {
                  try {
                    await deletePlaylist(playlist.id);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Playlist deleted",
                    });
                    onRefresh();
                  } catch (err) {
                    push(
                      <ErrorDetail
                        error={err instanceof Error ? err : String(err)}
                        context={{
                          action: "Delete Playlist",
                          playlistId: playlist.id,
                          playlistName: playlist.name,
                        }}
                      />,
                    );
                  }
                }
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function CreatePlaylistForm({ onSuccess }: { onSuccess: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("");
  const [visibility, setVisibility] = useState<"personal" | "org">("personal");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Playlist"
            onSubmit={async (values) => {
              try {
                const data: CreatePlaylistRequest = {
                  name: values.name,
                  description: values.description || undefined,
                  emoji: values.emoji || undefined,
                  visibility: values.visibility || "personal",
                };
                await createPlaylist(data);
                showToast({
                  style: Toast.Style.Success,
                  title: "Playlist created",
                });
                onSuccess();
                pop();
              } catch (error) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to create playlist",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Playlist"
        value={name}
        onChange={setName}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="A collection of videos"
        value={description}
        onChange={setDescription}
      />
      <Form.TextField
        id="emoji"
        title="Emoji"
        placeholder="🎬"
        value={emoji}
        onChange={setEmoji}
      />
      <Form.Dropdown
        id="visibility"
        title="Visibility"
        value={visibility}
        onChange={(newValue) => setVisibility(newValue as "personal" | "org")}
      >
        <Form.Dropdown.Item value="personal" title="Personal" />
        <Form.Dropdown.Item value="org" title="Organization" />
      </Form.Dropdown>
    </Form>
  );
}

function UpdatePlaylistForm({
  playlist,
  onSuccess,
}: {
  playlist: Playlist;
  onSuccess: () => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Playlist"
            onSubmit={async (values) => {
              try {
                const data: UpdatePlaylistRequest = {
                  name: values.name,
                  description: values.description || undefined,
                };
                await updatePlaylist(playlist.id, data);
                showToast({
                  style: Toast.Style.Success,
                  title: "Playlist updated",
                });
                onSuccess();
                pop();
              } catch (error) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to update playlist",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Playlist"
        value={name}
        onChange={setName}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="A collection of videos"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
