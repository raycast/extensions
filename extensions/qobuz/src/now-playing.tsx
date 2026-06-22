import { Clipboard, Icon, MenuBarExtra, open, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { appLink, deepLink, getClient } from "./lib/client";

export default function Command() {
  const { data: track, isLoading } = useCachedPromise(async () => {
    const client = await getClient();
    return client.nowPlaying();
  });

  const title = track
    ? `${track.artist?.name ?? "?"} — ${track.title}`
    : undefined;
  const url = track ? deepLink.track(track.id) : undefined;

  return (
    <MenuBarExtra
      icon={Icon.Music}
      title={title}
      isLoading={isLoading}
      tooltip="Qobuz — Now Playing"
    >
      {track && url ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Copy Share Link"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(url);
              await showHUD("Copied share link");
            }}
          />
          <MenuBarExtra.Item
            title="Open in Qobuz"
            icon={Icon.ArrowNe}
            onAction={() => open(appLink.track(track.id))}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Item title="Nothing playing in Qobuz" />
      )}
    </MenuBarExtra>
  );
}
