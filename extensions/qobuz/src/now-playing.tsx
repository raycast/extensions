import { Clipboard, Icon, MenuBarExtra, open, showHUD } from "@raycast/api"
import { useCachedPromise } from "@raycast/utils"
import { defaultPlayerStatePath, type Track } from "@kud/qobuz"
import { readFile } from "node:fs/promises"
import { appLink, deepLink, getClient } from "./lib/client"
import { sendMediaKey } from "./lib/media-keys"

const QUEUE_PREVIEW = 3
const HISTORY_PREVIEW = 3

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    const client = await getClient()

    let currentId: number | undefined
    let nextIds: number[] = []
    let histIds: number[] = []

    try {
      const state = JSON.parse(await readFile(defaultPlayerStatePath(), "utf8"))
      const queue = state?.playqueue?.data
      const activeList = queue?.shuffled ? queue?.shuffledItems : queue?.items
      const idx: number = queue?.currentIndex ?? 0
      currentId = activeList?.[idx]?.trackId
      nextIds = (activeList ?? [])
        .slice(idx + 1, idx + 1 + QUEUE_PREVIEW)
        .map((i: { trackId: number }) => i.trackId)
      histIds = (queue?.history ?? []).slice(0, HISTORY_PREVIEW)
    } catch {
      // player state absent — controls still work
    }

    const fetchTrack = (id: number) => client.tracks.get(id).catch(() => null)

    const [current, nextResults, histResults] = await Promise.all([
      currentId !== undefined ? fetchTrack(currentId) : Promise.resolve(null),
      Promise.all(nextIds.map(fetchTrack)),
      Promise.all(histIds.map(fetchTrack)),
    ])

    return {
      current: current ?? undefined,
      nextTracks: nextResults.filter(Boolean) as Track[],
      histTracks: histResults.filter(Boolean) as Track[],
    }
  })

  const control = (key: Parameters<typeof sendMediaKey>[0]) => async () => {
    await sendMediaKey(key).catch(() => {})
    setTimeout(revalidate, 500)
  }

  const trackIcon = (track: Track) =>
    track.album?.image?.small ? { source: track.album.image.small } : Icon.Music

  const title = data?.current
    ? `${data.current.artist?.name ?? "?"} — ${data.current.title}`
    : undefined

  return (
    <MenuBarExtra
      icon={Icon.Music}
      title={title}
      isLoading={isLoading}
      tooltip="Qobuz — Now Playing"
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Play / Pause"
          icon={Icon.Play}
          onAction={control("play")}
        />
        <MenuBarExtra.Item
          title="Previous"
          icon={Icon.Rewind}
          onAction={control("previous")}
        />
        <MenuBarExtra.Item
          title="Next"
          icon={Icon.Forward}
          onAction={control("next")}
        />
      </MenuBarExtra.Section>

      {(data?.nextTracks.length ?? 0) > 0 && (
        <MenuBarExtra.Section title="Up Next">
          {data!.nextTracks.map((track) => (
            <MenuBarExtra.Item
              key={track.id}
              title={track.title}
              subtitle={track.artist?.name}
              icon={trackIcon(track)}
              onAction={() => open(appLink.track(track.id))}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {(data?.histTracks.length ?? 0) > 0 && (
        <MenuBarExtra.Section title="History">
          {data!.histTracks.map((track) => (
            <MenuBarExtra.Item
              key={track.id}
              title={track.title}
              subtitle={track.artist?.name}
              icon={trackIcon(track)}
              onAction={() => open(appLink.track(track.id))}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {data?.current && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Copy Share Link"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(deepLink.track(data.current!.id))
              await showHUD("Copied share link")
            }}
          />
          <MenuBarExtra.Item
            title="Open in Qobuz"
            icon={Icon.ArrowNe}
            onAction={() => open(appLink.track(data.current!.id))}
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Qobuz"
          icon={Icon.Window}
          onAction={() => open("qobuzapp://")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  )
}
