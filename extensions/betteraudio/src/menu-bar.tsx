import { Icon, MenuBarExtra, open, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import {
  getStatus,
  getMediaInfo,
  setMute,
  toggleSilentMode as cliToggleSilentMode,
  volumeUp as cliVolumeUp,
  volumeDown as cliVolumeDown,
  cycleDevice as cliCycleDevice,
  mediaPlayPause as cliMediaPlayPause,
  mediaNext as cliMediaNext,
  mediaPrevious as cliMediaPrevious,
  mediaForward as cliMediaForward,
  mediaBackward as cliMediaBackward,
  mediaShuffle as cliMediaShuffle,
  mediaRepeat as cliMediaRepeat,
  setMediaVolume as cliSetMediaVolume,
  togglePanel as cliTogglePanel,
} from "./lib/cli";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMediaSignature(media: {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  player?: string | null;
  duration?: number | null;
}) {
  return [media.title, media.artist, media.album, media.player, media.duration]
    .map((value) => value ?? "")
    .join("|");
}

export default function Command() {
  const { data: status, isLoading, revalidate } = useCachedPromise(getStatus);
  const { data: media, revalidate: revalidateMedia } =
    useCachedPromise(getMediaInfo);
  const playbackOverrideRef = useRef<{ value: boolean; until: number } | null>(
    null,
  );
  const lastMediaSnapshotRef = useRef<{
    signature: string;
    position?: number | null;
    displayedIsPlaying: boolean;
  } | null>(null);

  const title = status ? `${Math.round(status.outputVolume)}%` : "—";
  const tooltip = status
    ? `BetterAudio — ${Math.round(status.outputVolume)}% ${status.isMuted ? "(Muted)" : ""}`
    : "BetterAudio";
  const now = Date.now();

  let displayedIsPlaying = media?.isPlaying ?? false;
  const playbackOverride = playbackOverrideRef.current;

  if (playbackOverride && now < playbackOverride.until) {
    displayedIsPlaying = playbackOverride.value;
  } else if (playbackOverride) {
    playbackOverrideRef.current = null;
  } else if (media && !media.isPlaying) {
    const previousSnapshot = lastMediaSnapshotRef.current;
    const signature = getMediaSignature(media);
    const sameTrack = previousSnapshot?.signature === signature;
    const currentPosition = media.position;
    const previousPosition = previousSnapshot?.position;

    if (
      sameTrack &&
      currentPosition != null &&
      previousPosition != null &&
      currentPosition - previousPosition > 0.75
    ) {
      displayedIsPlaying = true;
    } else if (sameTrack && previousSnapshot) {
      displayedIsPlaying = previousSnapshot.displayedIsPlaying;
    }
  }

  async function refreshAll() {
    await Promise.all([revalidate(), revalidateMedia()]);
  }

  useEffect(() => {
    if (!media) return;

    lastMediaSnapshotRef.current = {
      signature: getMediaSignature(media),
      position: media.position,
      displayedIsPlaying,
    };
  }, [
    media,
    displayedIsPlaying,
    media?.title,
    media?.artist,
    media?.album,
    media?.player,
    media?.duration,
    media?.position,
    media?.isPlaying,
  ]);

  return (
    <MenuBarExtra
      icon={Icon.SpeakerHigh}
      title={title}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      {status && (
        <>
          <MenuBarExtra.Section title="Volume">
            <MenuBarExtra.Item
              title={`Volume: ${Math.round(status.outputVolume)}%${status.isMuted ? " (Muted)" : ""}`}
              icon={status.isMuted ? Icon.SpeakerOff : Icon.SpeakerHigh}
            />
            <MenuBarExtra.Item
              title="Volume Up"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
              onAction={async () => {
                const vol = await cliVolumeUp();
                await showHUD(`🔊 ${Math.round(vol)}%`);
                revalidate();
              }}
            />
            <MenuBarExtra.Item
              title="Volume Down"
              icon={Icon.Minus}
              shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
              onAction={async () => {
                const vol = await cliVolumeDown();
                await showHUD(`🔉 ${Math.round(vol)}%`);
                revalidate();
              }}
            />
            <MenuBarExtra.Item
              title={status.isMuted ? "Unmute" : "Mute"}
              icon={status.isMuted ? Icon.SpeakerHigh : Icon.SpeakerOff}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={async () => {
                const muted = await setMute("toggle");
                await showHUD(muted ? "🔇 Muted" : "🔊 Unmuted");
                revalidate();
              }}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Quick Actions">
            <MenuBarExtra.Item
              title={`Silent Mode: ${status.isSilentMode ? "On" : "Off"}`}
              icon={Icon.BellDisabled}
              onAction={async () => {
                const silent = await cliToggleSilentMode();
                await showHUD(
                  silent ? "🤫 Silent Mode: On" : "🔊 Silent Mode: Off",
                );
                revalidate();
              }}
            />
            <MenuBarExtra.Item
              title="Cycle Output Device"
              icon={Icon.Switch}
              onAction={async () => {
                const msg = await cliCycleDevice();
                await showHUD(`🔄 ${msg}`);
                revalidate();
              }}
            />
            <MenuBarExtra.Item
              title="Toggle Panel"
              icon={Icon.AppWindowList}
              onAction={async () => {
                await cliTogglePanel();
              }}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Output">
            <MenuBarExtra.Item
              title={status.outputDevice?.name ?? "No Output"}
              icon={Icon.SpeakerHigh}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Media">
            {media ? (
              <>
                <MenuBarExtra.Item
                  title={media.title?.trim() || "Unknown Track"}
                  subtitle={
                    [media.artist, media.album].filter(Boolean).join(" — ") ||
                    media.player ||
                    "No additional info"
                  }
                  icon={displayedIsPlaying ? Icon.Music : Icon.Pause}
                />
                <MenuBarExtra.Item
                  title={`Status: ${displayedIsPlaying ? "Playing" : "Paused"}${media.player ? ` • ${media.player}` : ""}`}
                  icon={displayedIsPlaying ? Icon.Play : Icon.Pause}
                />
                {media.volume != null && (
                  <>
                    <MenuBarExtra.Item
                      title={`Media Volume: ${Math.round(media.volume)}%`}
                      icon={Icon.Gauge}
                    />
                    <MenuBarExtra.Item
                      title="Media Volume Up"
                      icon={Icon.Plus}
                      onAction={async () => {
                        const nextVolume = clamp(
                          Math.round(media.volume ?? 0) + 10,
                          0,
                          100,
                        );
                        await cliSetMediaVolume(nextVolume);
                        await showHUD(`🎚️ Media Volume ${nextVolume}%`);
                        await refreshAll();
                      }}
                    />
                    <MenuBarExtra.Item
                      title="Media Volume Down"
                      icon={Icon.Minus}
                      onAction={async () => {
                        const nextVolume = clamp(
                          Math.round(media.volume ?? 0) - 10,
                          0,
                          100,
                        );
                        await cliSetMediaVolume(nextVolume);
                        await showHUD(`🎚️ Media Volume ${nextVolume}%`);
                        await refreshAll();
                      }}
                    />
                  </>
                )}
              </>
            ) : (
              <MenuBarExtra.Item
                title="No media info available"
                subtitle="Playback controls still work"
                icon={Icon.Music}
              />
            )}
            <MenuBarExtra.Item
              title={displayedIsPlaying ? "Pause" : "Play / Pause"}
              icon={displayedIsPlaying ? Icon.Pause : Icon.Play}
              onAction={async () => {
                playbackOverrideRef.current = {
                  value: !displayedIsPlaying,
                  until: Date.now() + 6_000,
                };
                await cliMediaPlayPause();
                await showHUD("⏯ Play / Pause");
                await refreshAll();
              }}
            />
            <MenuBarExtra.Item
              title="Previous Track"
              icon={Icon.Rewind}
              onAction={async () => {
                await cliMediaPrevious();
                await showHUD("⏮ Previous Track");
                await refreshAll();
              }}
            />
            <MenuBarExtra.Item
              title="Next Track"
              icon={Icon.Forward}
              onAction={async () => {
                await cliMediaNext();
                await showHUD("⏭ Next Track");
                await refreshAll();
              }}
            />
            <MenuBarExtra.Item
              title="Backward 15s"
              icon={Icon.Rewind}
              onAction={async () => {
                await cliMediaBackward(15);
                await showHUD("⏪ Backward 15s");
                await refreshAll();
              }}
            />
            <MenuBarExtra.Item
              title="Forward 15s"
              icon={Icon.Forward}
              onAction={async () => {
                await cliMediaForward(15);
                await showHUD("⏩ Forward 15s");
                await refreshAll();
              }}
            />
            <MenuBarExtra.Item
              title="Toggle Shuffle"
              icon={Icon.Shuffle}
              onAction={async () => {
                await cliMediaShuffle();
                await showHUD("🔀 Shuffle toggled");
                await refreshAll();
              }}
            />
            <MenuBarExtra.Item
              title="Toggle Repeat"
              icon={Icon.Repeat}
              onAction={async () => {
                await cliMediaRepeat();
                await showHUD("🔁 Repeat toggled");
                await refreshAll();
              }}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={`Active Apps: ${status.activeAppCount}`}
              icon={Icon.AppWindowGrid3x3}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Open BetterAudio"
              icon={Icon.ArrowNe}
              onAction={() => open("/Applications/BetterAudio.app")}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
