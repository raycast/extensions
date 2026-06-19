import { Action, ActionPanel, Clipboard, Color, Detail, Form, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { useJellyfinSearch } from "./hooks/useJellyfinSearch";
import {
  clearCachedToken,
  credentialsConfigured,
  formatDuration,
  getImageUrl,
  getStreamUrl,
  getWebUrl,
  handleError,
  playWithMediaPlayer,
  resolveCredentials,
  saveSetupCredentials,
} from "./lib/jellyfin";
import type { JellyfinItem, JellyfinItemType } from "./types";

// ─── Filter dropdown values ───────────────────────────────────────────────────

type FilterValue = "all" | "Audio" | "MusicAlbum" | "MusicArtist";

const FILTER_OPTIONS: Array<{ title: string; value: FilterValue; icon: Icon }> = [
  { title: "All", value: "all", icon: Icon.Music },
  { title: "Tracks", value: "Audio", icon: Icon.Waveform },
  { title: "Albums", value: "MusicAlbum", icon: Icon.Cd },
  { title: "Artists", value: "MusicArtist", icon: Icon.Person },
];

function filterToTypes(filter: FilterValue): JellyfinItemType[] {
  if (filter === "all") return ["Audio", "MusicAlbum", "MusicArtist"];
  return [filter];
}

// ─── Item type accessories/icons ──────────────────────────────────────────────

function itemIcon(item: JellyfinItem): Icon {
  if (item.Type === "Audio") return Icon.Waveform;
  if (item.Type === "MusicAlbum") return Icon.Cd;
  if (item.Type === "MusicArtist") return Icon.Person;
  return Icon.Music;
}

function itemSubtitle(item: JellyfinItem): string {
  if (item.Type === "Audio") {
    const parts: string[] = [];
    if (item.AlbumArtist) parts.push(item.AlbumArtist);
    if (item.Album) parts.push(item.Album);
    return parts.join(" — ");
  }
  if (item.Type === "MusicAlbum") {
    return item.AlbumArtist ?? "";
  }
  return "";
}

// Track Detail view is rendered inline via List.Item.Detail inside MusicListItem

// ─── Action panel ─────────────────────────────────────────────────────────────

function ItemActions({ item, serverUrl }: { item: JellyfinItem; serverUrl: string }): React.ReactElement {
  const [isPlayLoading, setIsPlayLoading] = useState(false);

  async function playInMediaPlayer() {
    setIsPlayLoading(true);
    try {
      const url = await getStreamUrl(item.Id);
      await playWithMediaPlayer(url);
      await showToast({ style: Toast.Style.Success, title: "Playing", message: item.Name });
    } catch (e) {
      await handleError(e);
    } finally {
      setIsPlayLoading(false);
    }
  }

  async function copyStreamUrl() {
    try {
      const url = await getStreamUrl(item.Id);
      await Clipboard.copy(url);
      await showToast({ style: Toast.Style.Success, title: "Copied", message: "Stream URL copied to clipboard" });
    } catch (e) {
      await handleError(e);
    }
  }

  const webUrl = getWebUrl(item, serverUrl);

  return (
    <ActionPanel title={item.Name}>
      <ActionPanel.Section title="Playback">
        {item.Type === "Audio" && (
          <Action
            title={isPlayLoading ? "Opening…" : "Play"}
            icon={Icon.Play}
            onAction={playInMediaPlayer}
            shortcut={{ modifiers: [], key: "return" }}
          />
        )}
        {item.Type === "Audio" && (
          <Action
            title="Copy Stream URL"
            icon={Icon.Link}
            onAction={copyStreamUrl}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Jellyfin">
        <Action.OpenInBrowser
          title="Open in Jellyfin Web"
          url={webUrl}
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        <Action.CopyToClipboard
          title="Copy Item ID"
          content={item.Id}
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Account">
        <Action
          title="Clear Cached Auth Token"
          icon={Icon.Key}
          style={Action.Style.Destructive}
          onAction={async () => {
            await clearCachedToken();
            await showToast({ style: Toast.Style.Success, title: "Cleared", message: "Cached auth token removed" });
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

// ─── Setup form ───────────────────────────────────────────────────────────────────────

function SetupForm({ onComplete }: { onComplete: () => void }): React.ReactElement {
  async function handleSubmit(values: {
    serverUrl: string;
    apiKey: string;
    userId: string;
    username: string;
    password: string;
  }) {
    if (!values.serverUrl.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Server URL required",
        message: "Enter your Jellyfin server URL to continue",
      });
      return;
    }
    const hasApiKey = values.apiKey.trim() && values.userId.trim();
    const hasLogin = values.username.trim() && values.password.trim();
    if (!hasApiKey && !hasLogin) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Incomplete credentials",
        message: "Fill in API Key + User ID, or Username + Password",
      });
      return;
    }
    await saveSetupCredentials(values);
    onComplete();
  }

  return (
    <Form
      navigationTitle="Connect to Jellyfin"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save & Connect" icon={Icon.Key} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="serverUrl"
        title="Server URL"
        placeholder="http://192.168.1.10:8096"
        info="The URL of your Jellyfin server, including port if needed"
      />
      <Form.Separator />
      <Form.Description text="Fill in Option A or Option B to authenticate." />
      <Form.Separator />
      <Form.Description text="Option A — API Key (recommended)" />
      <Form.PasswordField id="apiKey" title="API Key" placeholder="Paste your API key" />
      <Form.TextField id="userId" title="User ID" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
      <Form.Separator />
      <Form.Description text="Option B — Username & Password" />
      <Form.TextField id="username" title="Username" placeholder="admin" />
      <Form.PasswordField id="password" title="Password" />
    </Form>
  );
}

// ─── Main List item ───────────────────────────────────────────────────────────

function MusicListItem({
  item,
  serverUrl,
  token,
}: {
  item: JellyfinItem;
  serverUrl: string;
  token: string;
}): React.ReactElement {
  const imageUrl = getImageUrl(item, serverUrl, token, 256);
  const durationStr = formatDuration(item.RunTimeTicks);
  const year = item.ProductionYear ? String(item.ProductionYear) : undefined;

  const accessories: List.Item.Accessory[] = [];
  if (durationStr && item.Type === "Audio") {
    accessories.push({ text: durationStr, tooltip: "Duration" });
  }
  if (item.Type === "MusicAlbum" && item.ChildCount) {
    accessories.push({ text: `${item.ChildCount} tracks`, tooltip: "Track count" });
  }
  if (year) {
    accessories.push({ tag: { value: year, color: Color.SecondaryText }, tooltip: "Release year" });
  }
  if (item.UserData?.IsFavorite) {
    accessories.push({ icon: { source: Icon.Heart, tintColor: Color.Red }, tooltip: "Favourite" });
  }

  const thumbnail: Image.ImageLike = {
    source: imageUrl,
    mask: Image.Mask.RoundedRectangle,
    fallback: itemIcon(item),
  };

  return (
    <List.Item
      id={item.Id}
      title={item.Name}
      subtitle={itemSubtitle(item)}
      icon={thumbnail}
      accessories={accessories}
      detail={
        item.Type === "Audio" ? (
          <List.Item.Detail
            isLoading={false}
            markdown={`![Cover](${imageUrl})`}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Title" text={item.Name} icon={thumbnail} />
                <List.Item.Detail.Metadata.Separator />
                {item.Artists?.length ? (
                  <List.Item.Detail.Metadata.Label title="Artist" text={item.Artists.join(", ")} />
                ) : null}
                {item.Album ? <List.Item.Detail.Metadata.Label title="Album" text={item.Album} /> : null}
                {item.IndexNumber ? (
                  <List.Item.Detail.Metadata.Label title="Track №" text={String(item.IndexNumber)} />
                ) : null}
                <List.Item.Detail.Metadata.Separator />
                {durationStr ? <List.Item.Detail.Metadata.Label title="Duration" text={durationStr} /> : null}
                {item.Bitrate ? (
                  <List.Item.Detail.Metadata.Label title="Bitrate" text={`${Math.round(item.Bitrate / 1000)} kbps`} />
                ) : null}
                {item.Container ? (
                  <List.Item.Detail.Metadata.Label title="Format" text={item.Container.toUpperCase()} />
                ) : null}
                <List.Item.Detail.Metadata.Separator />
                {item.ProductionYear ? (
                  <List.Item.Detail.Metadata.Label title="Year" text={String(item.ProductionYear)} />
                ) : null}
                {item.Genres?.length ? (
                  <List.Item.Detail.Metadata.TagList title="Genres">
                    {item.Genres.map((g) => (
                      <List.Item.Detail.Metadata.TagList.Item key={g} text={g} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                ) : null}
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={<ItemActions item={item} serverUrl={serverUrl} />}
    />
  );
}

// ─── Command entrypoint ───────────────────────────────────────────────────────

export default function SearchMusicCommand(): React.ReactElement {
  const [filter, setFilter] = useState<FilterValue>("Audio");
  const [showDetail, setShowDetail] = useState(true);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  // Resolved credentials are loaded for URL building
  const [creds, setCreds] = useState<{ serverUrl: string; token: string } | null>(null);
  const [credsError, setCredsError] = useState<string | null>(null);

  const { items, isLoading, error, totalCount, search } = useJellyfinSearch({
    types: filterToTypes(filter),
    enabled: needsSetup === false,
  });

  // Check if credentials are configured on mount
  useEffect(() => {
    credentialsConfigured()
      .then((ok) => setNeedsSetup(!ok))
      .catch(() => setNeedsSetup(true));
  }, []);

  // Resolve credentials once setup is confirmed done
  useEffect(() => {
    if (needsSetup !== false) return;
    resolveCredentials()
      .then((c) => setCreds({ serverUrl: c.serverUrl, token: c.token }))
      .catch((e) => setCredsError(e instanceof Error ? e.message : String(e)));
  }, [needsSetup]);

  // Surface search errors as toasts (only when setup is complete)
  useEffect(() => {
    if (error && needsSetup === false) handleError(error);
  }, [error, needsSetup]);

  if (needsSetup === null) return <List isLoading />;
  if (needsSetup) return <SetupForm onComplete={() => setNeedsSetup(false)} />;

  if (credsError) {
    return (
      <Detail
        markdown={`# ⚠️ Connection Error\n\n${credsError}\n\nUse the action below to clear your cached credentials and re-enter them.`}
        actions={
          <ActionPanel>
            <Action
              title="Clear Credentials & Retry"
              icon={Icon.Key}
              style={Action.Style.Destructive}
              onAction={async () => {
                await clearCachedToken();
                setCredsError(null);
                setNeedsSetup(true);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  const itemsByType: Record<string, JellyfinItem[]> = {};
  for (const item of items) {
    const group = item.Type ?? "Other";
    if (!itemsByType[group]) itemsByType[group] = [];
    itemsByType[group].push(item);
  }

  const typeLabels: Record<string, string> = {
    Audio: "Tracks",
    MusicAlbum: "Albums",
    MusicArtist: "Artists",
  };

  return (
    <List
      isLoading={isLoading || !creds}
      isShowingDetail={showDetail && filter === "Audio"}
      searchBarPlaceholder="Search tracks, albums, artists…"
      onSearchTextChange={search}
      throttle={false} // We handle debouncing ourselves
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by type"
          value={filter}
          onChange={(v) => {
            setFilter(v as FilterValue);
            // Only show detail panel for tracks
            setShowDetail(v === "Audio" || v === "all");
          }}
        >
          {FILTER_OPTIONS.map((opt) => (
            <List.Dropdown.Item key={opt.value} title={opt.title} value={opt.value} icon={opt.icon} />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && items.length === 0 ? (
        <List.EmptyView
          icon={Icon.Music}
          title="No results found"
          description="Try a different search term or change the filter"
        />
      ) : null}

      {creds &&
        Object.entries(itemsByType).map(([type, typeItems]) => (
          <List.Section key={type} title={typeLabels[type] ?? type} subtitle={`${typeItems.length} of ${totalCount}`}>
            {typeItems.map((item) => (
              <MusicListItem key={item.Id} item={item} serverUrl={creds.serverUrl} token={creds.token} />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
