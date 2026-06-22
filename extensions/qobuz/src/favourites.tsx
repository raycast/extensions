import { Action, ActionPanel, Icon, List } from "@raycast/api"
import { showFailureToast, useCachedPromise } from "@raycast/utils"
import { useState } from "react"
import type { FavouriteType } from "@kud/qobuz"
import {
  appLink,
  BRAND,
  deepLink,
  formatDuration,
  getClient,
} from "./lib/client"

export default function Command() {
  const [type, setType] = useState<FavouriteType>("albums")

  const { data, isLoading } = useCachedPromise(
    async (favouriteType: FavouriteType) => {
      const client = await getClient()
      return client.favourites.list(favouriteType)
    },
    [type],
    {
      keepPreviousData: true,
      onError: (error) => {
        showFailureToast(error, { title: "Couldn't load favourites" })
      },
    },
  )

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter favourites…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Favourite type"
          value={type}
          onChange={(value) => setType(value as FavouriteType)}
        >
          <List.Dropdown.Item title="Albums" value="albums" />
          <List.Dropdown.Item title="Artists" value="artists" />
          <List.Dropdown.Item title="Tracks" value="tracks" />
        </List.Dropdown>
      }
    >
      {type === "albums" &&
        (data?.albums ?? []).map((album) => (
          <List.Item
            key={`album-${album.id}`}
            icon={
              album.image?.small ?? { source: Icon.Music, tintColor: BRAND }
            }
            title={album.title}
            subtitle={album.artist?.name ?? ""}
            accessories={album.hires ? [{ tag: "Hi-Res" }] : []}
            actions={
              <LinkActions
                app={appLink.album(album.id)}
                web={deepLink.album(album.id)}
              />
            }
          />
        ))}

      {type === "artists" &&
        (data?.artists ?? []).map((artist) => (
          <List.Item
            key={`artist-${artist.id}`}
            icon={artist.picture ?? { source: Icon.Person, tintColor: BRAND }}
            title={artist.name}
            actions={
              <LinkActions
                app={appLink.artist(artist.id)}
                web={deepLink.artist(artist.id)}
              />
            }
          />
        ))}

      {type === "tracks" &&
        (data?.tracks ?? []).map((track) => (
          <List.Item
            key={`track-${track.id}`}
            icon={
              track.album?.image?.small ?? {
                source: Icon.Music,
                tintColor: BRAND,
              }
            }
            title={track.title}
            subtitle={track.artist?.name ?? ""}
            accessories={[{ text: formatDuration(track.duration) }]}
            actions={
              <LinkActions
                app={appLink.track(track.id)}
                web={deepLink.track(track.id)}
              />
            }
          />
        ))}
    </List>
  )
}

function LinkActions({ app, web }: { app: string; web: string }) {
  return (
    <ActionPanel>
      <Action.Open title="Open in Qobuz" target={app} icon={Icon.Music} />
      <Action.OpenInBrowser title="Open in Browser" url={web} />
      <Action.CopyToClipboard title="Copy Share Link" content={web} />
    </ActionPanel>
  )
}
