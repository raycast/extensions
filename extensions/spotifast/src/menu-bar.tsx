import { getPreferenceValues, Icon, Image, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { JSX } from "react";
import { showSpotifastError } from "./control";
import {
  Device,
  formatRepeat,
  formatTrack,
  getDevices,
  getNowPlaying,
  NowPlaying,
  openSpotifast,
  RepeatMode,
  runAndSettle,
  SpotifastNotInstalledError,
  SpotifastNotRunningError,
} from "./spotifast";

const TITLE_LIMIT = 40;
const REPEAT_MODES: RepeatMode[] = ["off", "context", "track"];

type PlayerState =
  { kind: "playing"; track: NowPlaying } | { kind: "idle" } | { kind: "not-running" } | { kind: "not-installed" };

export default function Command(): JSX.Element {
  const { showTrackTitle } = getPreferenceValues<Preferences.MenuBar>();
  const player = useCachedPromise(loadPlayerState, [], { keepPreviousData: true });
  const running = player.data?.kind === "playing" || player.data?.kind === "idle";
  const devices = useCachedPromise(loadDevices, [], { execute: running, keepPreviousData: true });
  const isLoading = player.isLoading || devices.isLoading;

  async function act(
    args: string[],
    changed: (before: NowPlaying | null, after: NowPlaying | null) => boolean = () => false,
  ) {
    try {
      await runAndSettle(args, changed);
    } catch (error) {
      await showSpotifastError(error);
    }
    player.revalidate();
  }

  async function transfer(device: Device) {
    await act(["transfer", device.id]);
    devices.revalidate();
  }

  const state = player.data;
  const track = state?.kind === "playing" ? state.track : undefined;
  const title = track && showTrackTitle ? truncate(formatTrack(track)) : undefined;

  return (
    <MenuBarExtra
      icon={Icon.Music}
      title={title}
      tooltip={track ? formatTrack(track) : "Spotifast"}
      isLoading={isLoading}
    >
      {state?.kind === "not-installed" && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Spotifast is not installed" icon={Icon.Warning} />
          <MenuBarExtra.Item
            title="Download Spotifast"
            icon={Icon.Download}
            onAction={() => open("https://spotifast.rocks/download/")}
          />
        </MenuBarExtra.Section>
      )}
      {state?.kind === "not-running" && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Spotifast is not running" icon={Icon.Warning} />
        </MenuBarExtra.Section>
      )}
      {state?.kind === "idle" && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Nothing playing" icon={Icon.Music} />
        </MenuBarExtra.Section>
      )}
      {track && (
        <>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={track.title}
              subtitle={track.artists}
              icon={track.artUrl ? { source: track.artUrl, mask: Image.Mask.RoundedRectangle } : Icon.Music}
              tooltip={track.album}
              onAction={() => openSpotifast().catch(showSpotifastError)}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={track.state === "playing" ? "Pause" : "Play"}
              icon={track.state === "playing" ? Icon.Pause : Icon.Play}
              onAction={() => act(["play-pause"], (before, after) => before?.state !== after?.state)}
            />
            <MenuBarExtra.Item
              title="Next Track"
              icon={Icon.Forward}
              onAction={() => act(["next"], (before, after) => before?.title !== after?.title)}
            />
            <MenuBarExtra.Item
              title="Previous Track"
              icon={Icon.Rewind}
              onAction={() => act(["previous"], (before, after) => before?.title !== after?.title)}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={track.saved ? "Remove from Liked Songs" : track.saved === false ? "Like" : "Like / Unlike"}
              icon={track.saved ? Icon.HeartDisabled : Icon.Heart}
              onAction={() => act(["like"], (before, after) => before?.saved !== after?.saved)}
            />
            <MenuBarExtra.Item
              title={track.shuffle ? "Turn Off Shuffle" : "Turn On Shuffle"}
              icon={Icon.Shuffle}
              onAction={() => act(["shuffle"], (before, after) => before?.shuffle !== after?.shuffle)}
            />
            <MenuBarExtra.Submenu title={formatRepeat(track.repeat)} icon={Icon.Repeat}>
              {REPEAT_MODES.map((mode) => (
                <MenuBarExtra.Item
                  key={mode}
                  title={formatRepeat(mode)}
                  icon={mode === track.repeat ? Icon.Checkmark : undefined}
                  onAction={() => act(["repeat", mode], (_, after) => after?.repeat === mode)}
                />
              ))}
            </MenuBarExtra.Submenu>
            <MenuBarExtra.Submenu
              title={track.volume === 0 ? "Muted" : `Volume ${track.volume}%`}
              icon={track.volume === 0 ? Icon.SpeakerOff : Icon.SpeakerOn}
            >
              <MenuBarExtra.Item
                title="Volume Up"
                icon={Icon.SpeakerUp}
                onAction={() => act(["volume-up"], (before, after) => before?.volume !== after?.volume)}
              />
              <MenuBarExtra.Item
                title="Volume Down"
                icon={Icon.SpeakerDown}
                onAction={() => act(["volume-down"], (before, after) => before?.volume !== after?.volume)}
              />
              <MenuBarExtra.Item
                title={track.volume === 0 ? "Unmute" : "Mute"}
                icon={Icon.SpeakerOff}
                onAction={() => act(["mute"], (before, after) => before?.volume !== after?.volume)}
              />
            </MenuBarExtra.Submenu>
          </MenuBarExtra.Section>
        </>
      )}
      {running && (devices.data?.length ?? 0) > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Submenu title={track?.device ? `Playing on ${track.device}` : "Play On"} icon={Icon.Devices}>
            {devices.data?.map((device) => (
              <MenuBarExtra.Item
                key={device.id}
                title={device.name}
                subtitle={device.kind}
                icon={device.active ? Icon.Checkmark : undefined}
                onAction={() => transfer(device)}
              />
            ))}
          </MenuBarExtra.Submenu>
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        {state?.kind !== "not-installed" && (
          <MenuBarExtra.Item
            title="Open Spotifast"
            icon={Icon.AppWindow}
            onAction={() => openSpotifast().catch(showSpotifastError)}
          />
        )}
        <MenuBarExtra.Item title="Configure Command" icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

// Missing or stopped apps are ordinary states for a menu bar item, not
// failures to toast about every poll.
async function loadPlayerState(): Promise<PlayerState> {
  try {
    const track = await getNowPlaying();
    return track ? { kind: "playing", track } : { kind: "idle" };
  } catch (error) {
    if (error instanceof SpotifastNotRunningError) return { kind: "not-running" };
    if (error instanceof SpotifastNotInstalledError) return { kind: "not-installed" };
    throw error;
  }
}

async function loadDevices(): Promise<Device[]> {
  try {
    return await getDevices();
  } catch {
    return [];
  }
}

function truncate(text: string): string {
  return text.length > TITLE_LIMIT ? `${text.slice(0, TITLE_LIMIT - 1)}…` : text;
}
