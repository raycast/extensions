import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef } from "react";

import { clearSessionKey, getSessionKey, loveTrack, unloveTrack } from "./functions/lastfm";
import { useAuthState } from "./hooks/useAuthState";
import { useNowPlaying } from "./hooks/useNowPlaying";
import { useTrackLoved } from "./hooks/useTrackLoved";
import { ConnectLastFm } from "./components/ConnectLastFm";

const AUTH_STATUS: Record<string, string> = {
  none: "Not connected",
  pending: "Waiting for authorization…",
  connected: "Connected ✓",
};

const AUTH_ICON: Record<string, Icon> = {
  none: Icon.XMarkCircle,
  pending: Icon.Clock,
  connected: Icon.CheckCircle,
};

export default function NowPlaying(props: { launchContext?: { openConnect?: boolean } }) {
  const openConnect = props.launchContext?.openConnect ?? false;
  const { apikey, apiSecret } = getPreferenceValues<Preferences.NowPlaying>();
  const { push } = useNavigation();
  const { track, isPlaying, isLoading } = useNowPlaying();
  const { isLoved, setIsLoved } = useTrackLoved(track?.artist?.["#text"], track?.name);
  const { authState, setAuthState } = useAuthState();
  const hasPushed = useRef(false);

  useEffect(() => {
    if (openConnect && !hasPushed.current && authState !== null && authState !== "connected" && apiSecret) {
      hasPushed.current = true;
      push(<ConnectLastFm apikey={apikey} apiSecret={apiSecret} onConnected={() => setAuthState("connected")} />);
    }
  }, [authState, openConnect]);

  const canLove = !!apiSecret;

  if (!isLoading && !isPlaying) {
    return (
      <Detail
        markdown={`# Nothing is playing right now\n\nStart scrobbling on Last.fm to see your now playing track here.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Last.fm" url="https://www.last.fm" icon={Icon.Globe} />
          </ActionPanel>
        }
      />
    );
  }

  const artist = track?.artist?.["#text"] ?? "";
  const album = track?.album?.["#text"] ?? "";
  const albumArt =
    track?.image.find((img) => img.size === "extralarge")?.["#text"] ??
    track?.image.find((img) => img.size === "large")?.["#text"];

  const artistUrl = track?.url.includes("/_/") ? track.url.split("/_/")[0] : undefined;
  const albumUrl = album && artistUrl ? `${artistUrl}/${encodeURIComponent(album).replace(/%20/g, "+")}` : undefined;

  const markdown = track
    ? [
        albumArt ? `![${track.name}](${albumArt}?raycast-width=250&raycast-height=250)` : "",
        "",
        `# ${track.name}`,
        artist ? `by **${artist}**` : "",
      ].join("\n")
    : "";

  async function handleLove() {
    if (!track || !apiSecret) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Loving track…" });
    try {
      const sk = await getSessionKey();
      if (!sk) throw new Error("Not connected. Use 'Set up Love/Unlove' to connect first.");
      await loveTrack(artist, track.name, apikey, apiSecret, sk);
      setIsLoved(true);
      toast.style = Toast.Style.Success;
      toast.title = "Loved";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to love track";
      toast.message = (err as Error).message;
    }
  }

  async function handleUnlove() {
    if (!track || !apiSecret) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Unloving track…" });
    try {
      const sk = await getSessionKey();
      if (!sk) throw new Error("Not connected. Use 'Set up Love/Unlove' to connect first.");
      await unloveTrack(artist, track.name, apikey, apiSecret, sk);
      setIsLoved(false);
      toast.style = Toast.Style.Success;
      toast.title = "Unloved";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to unlove track";
      toast.message = (err as Error).message;
    }
  }

  async function handleDisconnect() {
    await clearSessionKey();
    setAuthState("none");
    await showToast({ style: Toast.Style.Success, title: "Disconnected from Last.fm" });
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading && !track}
      metadata={
        track ? (
          <Detail.Metadata>
            <Detail.Metadata.Link title="Track" text={track.name} target={track.url} />
            {artistUrl ? (
              <Detail.Metadata.Link title="Artist" text={artist} target={artistUrl} />
            ) : (
              <Detail.Metadata.Label title="Artist" text={artist} />
            )}
            {album && albumUrl ? (
              <Detail.Metadata.Link title="Album" text={album} target={albumUrl} />
            ) : album ? (
              <Detail.Metadata.Label title="Album" text={album} />
            ) : null}
            {!canLove && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label
                  title="Love / Unlove"
                  text="Add API Secret in preferences to enable"
                  icon={Icon.Star}
                />
              </>
            )}
            {canLove && authState && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label
                  title="Last.fm Account"
                  text={AUTH_STATUS[authState]}
                  icon={AUTH_ICON[authState]}
                />
              </>
            )}
          </Detail.Metadata>
        ) : null
      }
      actions={
        track ? (
          <ActionPanel>
            {canLove && authState === "connected" && isLoved === false && (
              <Action title="Love Track" onAction={handleLove} />
            )}
            {canLove && authState === "connected" && isLoved === true && (
              <Action title="Unlove Track" onAction={handleUnlove} />
            )}
            <ActionPanel.Section title="Open">
              <Action.OpenInBrowser title="Song on Last.fm" url={track.url} />
              {artistUrl && <Action.OpenInBrowser title="Artist on Last.fm" url={artistUrl} icon={Icon.Person} />}
              {albumUrl && <Action.OpenInBrowser title="Album on Last.fm" url={albumUrl} icon={Icon.Music} />}
            </ActionPanel.Section>
            <ActionPanel.Section title="Copy">
              <Action
                title="Song & Artist"
                icon={Icon.Clipboard}
                onAction={() => Clipboard.copy(`${track.name} - ${artist}`)}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action.CopyToClipboard
                title="Song URL"
                content={track.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              {artistUrl && (
                <Action.CopyToClipboard
                  title="Artist URL"
                  content={artistUrl}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                />
              )}
              {albumUrl && (
                <Action.CopyToClipboard
                  title="Album URL"
                  content={albumUrl}
                  shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
                />
              )}
            </ActionPanel.Section>
            {!canLove && (
              <ActionPanel.Section title="Account">
                <Action title="Enable Love / Unlove" icon={Icon.Star} onAction={openExtensionPreferences} />
              </ActionPanel.Section>
            )}
            {canLove && authState !== null && (
              <ActionPanel.Section title="Account">
                {authState !== "connected" && (
                  <Action
                    title="Connect Last.fm Account"
                    icon={Icon.Link}
                    onAction={() =>
                      push(
                        <ConnectLastFm
                          apikey={apikey}
                          apiSecret={apiSecret!}
                          onConnected={() => setAuthState("connected")}
                        />,
                      )
                    }
                  />
                )}
                {authState === "connected" && (
                  <Action title="Disconnect" icon={Icon.Trash} onAction={handleDisconnect} />
                )}
              </ActionPanel.Section>
            )}
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
