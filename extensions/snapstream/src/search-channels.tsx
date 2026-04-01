import {
  List,
  ActionPanel,
  Action,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  Color,
  LocalStorage,
} from "@raycast/api";
import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { loadChannelsFromJson, fetchRemotePlaylist, groupChannelsByCategory } from "./lib/channels";
import { openStream } from "./lib/player";
import { Channel, Preferences } from "./lib/types";

const FAVORITES_KEY = "favorites";

export default function SearchChannels() {
  const preferences = getPreferenceValues<Preferences>();

  const { data: channels = [], isLoading: isLoadingChannels } = useCachedPromise(async () => {
    const local = loadChannelsFromJson();
    const remote = preferences.playlistUrl ? await fetchRemotePlaylist(preferences.playlistUrl) : [];
    return [...local, ...remote];
  });

  const {
    data: favoritesRaw,
    isLoading: isLoadingFavorites,
    revalidate: revalidateFavorites,
  } = useCachedPromise(async () => {
    const stored = await LocalStorage.getItem<string>(FAVORITES_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  });

  const favorites = new Set(favoritesRaw ?? []);

  async function toggleFavorite(channel: Channel) {
    const current = favoritesRaw ?? [];
    let updated: string[];

    if (current.includes(channel.url)) {
      updated = current.filter((url) => url !== channel.url);
      await showToast({ style: Toast.Style.Success, title: `Removed ${channel.name} from favorites` });
    } else {
      updated = [...current, channel.url];
      await showToast({ style: Toast.Style.Success, title: `Added ${channel.name} to favorites` });
    }

    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    revalidateFavorites();
  }

  const { data: sortedChannels, visitItem } = useFrecencySorting(channels, {
    key: (item) => item.url,
  });

  const favoriteChannels = sortedChannels.filter((c) => favorites.has(c.url));
  const nonFavoriteChannels = sortedChannels.filter((c) => !favorites.has(c.url));
  const grouped = groupChannelsByCategory(nonFavoriteChannels);
  const sortedCategories = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

  const isLoading = isLoadingChannels || isLoadingFavorites;

  function renderItem(channel: Channel, isFavorite: boolean) {
    return (
      <List.Item
        key={channel.url}
        title={channel.name}
        subtitle={channel.group}
        icon={isFavorite ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Video}
        keywords={[...channel.name.split(/\s+/), ...channel.group.split(/\s+/)]}
        actions={
          <ActionPanel>
            <Action
              title="Play in PiP"
              icon={Icon.Play}
              onAction={async () => {
                await openStream(channel.url, channel.name);
                visitItem(channel);
              }}
            />
            <Action
              title="Toggle Favorite"
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() => toggleFavorite(channel)}
            />
            <Action.CopyToClipboard title="Copy Stream URL" content={channel.url} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List filtering={true} isLoading={isLoading}>
      <List.EmptyView
        title="No channels found"
        description="Add channels to channels.json or set a playlist URL in preferences"
      />

      {favoriteChannels.length > 0 && (
        <List.Section title="Favorites">{favoriteChannels.map((channel) => renderItem(channel, true))}</List.Section>
      )}

      {sortedCategories.map((category) => (
        <List.Section key={category} title={category}>
          {grouped.get(category)!.map((channel) => renderItem(channel, false))}
        </List.Section>
      ))}
    </List>
  );
}
