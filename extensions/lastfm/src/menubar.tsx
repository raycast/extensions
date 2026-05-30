import {
  Clipboard,
  Image,
  LaunchType,
  MenuBarExtra,
  Toast,
  getPreferenceValues,
  launchCommand,
  open,
  openCommandPreferences,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";

import { clearSessionKey, getSessionKey, loveTrack, unloveTrack } from "./functions/lastfm";
import { useAuthState } from "./hooks/useAuthState";
import { useNowPlaying } from "./hooks/useNowPlaying";
import { useTrackLoved } from "./hooks/useTrackLoved";

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[([](feat\.|ft\.|featuring)[^)\]]*[)\]]/gi, "")
    .replace(/\s*-\s*(feat\.|ft\.|featuring)\s+[^-]*/gi, "")
    .replace(
      /\s*[([](remastered|radio edit|original mix|extended mix|single version|explicit|clean|live|acoustic|instrumental)[^)\]]*[)\]]/gi,
      "",
    )
    .replace(/\s*-\s*(remastered|radio edit)[^-([]*/gi, "")
    .trim();
}

export default function NowPlayingMenuBar() {
  const { menubarIcon, nowPlayingLength, hideArtistName, cleanupSongTitle, apikey, apiSecret } =
    getPreferenceValues<Preferences.Menubar>();
  const canLove = !!apiSecret;
  const { track, isPlaying, isLoading } = useNowPlaying();
  const { isLoved, setIsLoved } = useTrackLoved(
    isPlaying ? track?.artist?.["#text"] : undefined,
    isPlaying ? track?.name : undefined,
  );
  const { authState, setAuthState } = useAuthState();

  if (!isPlaying && !isLoading) {
    return null;
  }

  const artist = track?.artist?.["#text"] ?? "";
  const album = track?.album?.["#text"] ?? "";
  const trackName = cleanupSongTitle && track ? cleanTitle(track.name) : (track?.name ?? "");
  const maxLen = parseInt(nowPlayingLength, 10) || 0;
  const rawTitle = track ? (hideArtistName ? trackName : `${trackName} - ${artist}`) : "…";
  const title = maxLen > 0 && rawTitle.length > maxLen ? `${rawTitle.slice(0, maxLen)}…` : rawTitle;
  const albumArt =
    track?.image.find((img) => img.size === "extralarge")?.["#text"] ??
    track?.image.find((img) => img.size === "large")?.["#text"];
  const iconSource = menubarIcon === "album" && albumArt ? albumArt : "command-icon.png";
  const menubarIconSrc: Image.ImageLike = { source: iconSource, mask: Image.Mask.RoundedRectangle };

  const artistUrl = track?.url.includes("/_/") ? track.url.split("/_/")[0] : undefined;
  const albumUrl = album && artistUrl ? `${artistUrl}/${encodeURIComponent(album).replace(/%20/g, "+")}` : undefined;

  return (
    <MenuBarExtra title={title} icon={menubarIconSrc} isLoading={isLoading && !track}>
      {track && (
        <>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item icon={albumArt} title={track.name} subtitle={artist} />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Open">
            <MenuBarExtra.Item
              title="Song on Last.fm"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() => open(track.url)}
            />
            {artistUrl && (
              <MenuBarExtra.Item
                title="Artist on Last.fm"
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                onAction={() => open(artistUrl)}
              />
            )}
            {albumUrl && (
              <MenuBarExtra.Item
                title="Album on Last.fm"
                shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                onAction={() => open(albumUrl)}
              />
            )}
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Copy">
            <MenuBarExtra.Item
              title="Song & Artist"
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={() => Clipboard.copy(`${track.name} - ${artist}`)}
            />
            <MenuBarExtra.Item
              title="Song URL"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => Clipboard.copy(track.url)}
            />
            {artistUrl && (
              <MenuBarExtra.Item
                title="Artist URL"
                shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                onAction={() => Clipboard.copy(artistUrl)}
              />
            )}
            {albumUrl && (
              <MenuBarExtra.Item
                title="Album URL"
                shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
                onAction={() => Clipboard.copy(albumUrl)}
              />
            )}
          </MenuBarExtra.Section>

          {!canLove && (
            <MenuBarExtra.Section title="Last.fm">
              <MenuBarExtra.Item title="Enable Love / Unlove…" onAction={openExtensionPreferences} />
            </MenuBarExtra.Section>
          )}

          {canLove && authState !== null && (
            <MenuBarExtra.Section title="Last.fm">
              {authState === "connected" && (
                <>
                  {isLoved === false && (
                    <MenuBarExtra.Item
                      title="Love Track"
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                      onAction={async () => {
                        if (!track || !apiSecret) return;
                        const toast = await showToast({ style: Toast.Style.Animated, title: "Loving track…" });
                        try {
                          const sk = await getSessionKey();
                          if (!sk) throw new Error("Not connected.");
                          await loveTrack(artist, track.name, apikey, apiSecret, sk);
                          setIsLoved(true);
                          toast.style = Toast.Style.Success;
                          toast.title = "Loved";
                        } catch (err) {
                          toast.style = Toast.Style.Failure;
                          toast.title = (err as Error).message;
                        }
                      }}
                    />
                  )}
                  {isLoved === true && (
                    <MenuBarExtra.Item
                      title="Unlove Track"
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                      onAction={async () => {
                        if (!track || !apiSecret) return;
                        const toast = await showToast({ style: Toast.Style.Animated, title: "Unloving track…" });
                        try {
                          const sk = await getSessionKey();
                          if (!sk) throw new Error("Not connected.");
                          await unloveTrack(artist, track.name, apikey, apiSecret, sk);
                          setIsLoved(false);
                          toast.style = Toast.Style.Success;
                          toast.title = "Unloved";
                        } catch (err) {
                          toast.style = Toast.Style.Failure;
                          toast.title = (err as Error).message;
                        }
                      }}
                    />
                  )}
                  <MenuBarExtra.Item
                    title="Disconnect"
                    onAction={async () => {
                      await clearSessionKey();
                      setAuthState("none");
                      await showToast({ style: Toast.Style.Success, title: "Disconnected from Last.fm" });
                    }}
                  />
                </>
              )}

              {(authState === "none" || authState === "pending") && (
                <MenuBarExtra.Item
                  title={authState === "pending" ? "Complete Connection…" : "Set Up Love / Unlove…"}
                  onAction={() =>
                    launchCommand({
                      name: "now-playing",
                      type: LaunchType.UserInitiated,
                      context: { openConnect: true },
                    })
                  }
                />
              )}
            </MenuBarExtra.Section>
          )}

          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Configure Command"
              shortcut={{ modifiers: ["cmd"], key: "," }}
              onAction={() => openCommandPreferences()}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
