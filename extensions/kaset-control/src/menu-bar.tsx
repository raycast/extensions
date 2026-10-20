import {
  Color,
  Icon,
  Image,
  LocalStorage,
  MenuBarExtra,
  open,
  LaunchType,
  launchCommand,
  getPreferenceValues,
  environment,
  showHUD,
} from "@raycast/api";
import { getProgressIcon, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  getKasetState,
  isKasetRunning,
  recordPlayed,
  KasetState,
} from "./utils/kaset";

const MENU_BAR_ENABLED_KEY = "menuBarEnabled";

async function fetchState() {
  const running = await isKasetRunning();
  if (!running) return null;
  const state = await getKasetState();
  if (state?.currentTrack) {
    await recordPlayed(state.currentTrack);
  }
  return state;
}

export default function Command() {
  const [isHidden, setIsHidden] = useState(false);

  const { data, isLoading } = usePromise(async () => {
    const enabled = await LocalStorage.getItem<boolean>(MENU_BAR_ENABLED_KEY);

    // If user explicitly launches the command, re-enable the menu bar
    if (environment.launchType === LaunchType.UserInitiated) {
      if (enabled === false) {
        await LocalStorage.setItem(MENU_BAR_ENABLED_KEY, true);
        return { enabled: true, state: await fetchState() };
      }
    } else if (enabled === false) {
      // Background refresh while disabled - stay hidden
      return { enabled: false, state: null };
    }

    // First run or already enabled
    if (enabled === undefined) {
      await LocalStorage.setItem(MENU_BAR_ENABLED_KEY, true);
    }

    return { enabled: true, state: await fetchState() };
  });

  // Hooks must run before any early return.
  const title = useMenuBarTitle(data?.state);

  // If disabled (either by local state or persisted), hide the menu bar
  if (isHidden || data?.enabled === false) {
    return null;
  }

  const state = data?.state;
  const prefs = getPreferenceValues<Preferences>();

  if (prefs.hideWhenIdle && !state?.currentTrack) {
    return null;
  }

  return (
    <MenuBarExtra
      icon={getMenuBarIcon(state)}
      title={title}
      isLoading={isLoading}
    >
      {state?.currentTrack ? (
        <>
          <MenuBarExtra.Section title="Now Playing">
            <MenuBarExtra.Item
              title={state.currentTrack.name}
              subtitle={state.currentTrack.artist}
              onAction={() =>
                launchCommand({
                  name: "now-playing",
                  type: LaunchType.UserInitiated,
                })
              }
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Playback">
            <MenuBarExtra.Item
              title={state.playerState === "playing" ? "Pause" : "Play"}
              icon={state.playerState === "playing" ? Icon.Pause : Icon.Play}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              onAction={() =>
                launchCommand({
                  name: "toggle-playback",
                  type: LaunchType.Background,
                })
              }
            />
            <MenuBarExtra.Item
              title="Next Track"
              icon={Icon.Forward}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() =>
                launchCommand({
                  name: "next-track",
                  type: LaunchType.Background,
                })
              }
            />
            <MenuBarExtra.Item
              title="Previous Track"
              icon={Icon.Rewind}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={() =>
                launchCommand({
                  name: "previous-track",
                  type: LaunchType.Background,
                })
              }
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Volume">
            <MenuBarExtra.Item
              title={state.muted ? "Unmute" : "Mute"}
              icon={state.muted ? Icon.SpeakerOff : Icon.SpeakerHigh}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={() =>
                launchCommand({
                  name: "toggle-mute",
                  type: LaunchType.Background,
                })
              }
            />
            <MenuBarExtra.Item
              title={`Volume: ${state.volume}%`}
              icon={Icon.SpeakerHigh}
              onAction={() =>
                launchCommand({
                  name: "volume",
                  type: LaunchType.UserInitiated,
                })
              }
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Modes">
            <MenuBarExtra.Item
              title={`Shuffle: ${state.shuffling ? "On" : "Off"}`}
              icon={Icon.Shuffle}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() =>
                launchCommand({
                  name: "toggle-shuffle",
                  type: LaunchType.Background,
                })
              }
            />
            <MenuBarExtra.Item
              title={`Repeat: ${state.repeating}`}
              icon={Icon.Repeat}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() =>
                launchCommand({
                  name: "cycle-repeat",
                  type: LaunchType.Background,
                })
              }
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Rating">
            <MenuBarExtra.Item
              title={state.likeStatus === "liked" ? "Unlike" : "Like"}
              icon={Icon.Heart}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() =>
                launchCommand({
                  name: "like-track",
                  type: LaunchType.Background,
                })
              }
            />
            <MenuBarExtra.Item
              title={
                state.likeStatus === "disliked" ? "Remove Dislike" : "Dislike"
              }
              icon={Icon.HeartDisabled}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() =>
                launchCommand({
                  name: "dislike-track",
                  type: LaunchType.Background,
                })
              }
            />
          </MenuBarExtra.Section>
        </>
      ) : (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Kaset is not playing"
            icon={Icon.Music}
            onAction={() => open("kaset://")}
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Kaset"
          icon={Icon.AppWindow}
          onAction={() => open("kaset://")}
        />
        <MenuBarExtra.Item
          title="Hide Menu Bar"
          icon={Icon.EyeDisabled}
          onAction={async () => {
            setIsHidden(true);
            await LocalStorage.setItem(MENU_BAR_ENABLED_KEY, false);
            await showHUD(
              "Menu bar hidden. Run 'Show Menu Bar' to show again.",
            );
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function getMenuBarIcon(
  state: KasetState | null | undefined,
): Image.ImageLike | string {
  const { menuBarIconStyle } = getPreferenceValues<Preferences>();

  if (menuBarIconStyle === "progress" && state && state.duration > 0) {
    return getProgressIcon(state.position / state.duration, Color.PrimaryText);
  }

  if (state?.currentTrack?.artworkURL) {
    return {
      source: state.currentTrack.artworkURL,
      mask: Image.Mask.RoundedRectangle,
    };
  }

  return Icon.Music;
}

function useMenuBarTitle(
  state: KasetState | null | undefined,
): string | undefined {
  const { menuBarStyle } = getPreferenceValues<Preferences>();
  const [offset, setOffset] = useState(0);

  const maxLengthMap: Record<string, number> = {
    short: 20,
    medium: 35,
    long: 50,
    marquee: 40,
  };
  const maxLength = maxLengthMap[menuBarStyle] ?? 20;

  const track = state?.currentTrack;
  const full = track ? `${track.name} — ${track.artist}` : undefined;
  const marquee = menuBarStyle === "marquee";
  const needsScroll = marquee && !!full && full.length > maxLength;

  useEffect(() => {
    if (!needsScroll || !full) return;
    const padded = `${full}   `;
    const id = setInterval(
      () => setOffset((value) => (value + 1) % padded.length),
      300,
    );
    return () => clearInterval(id);
  }, [needsScroll, full]);

  if (menuBarStyle === "icon" || !full) {
    return undefined;
  }

  if (!needsScroll) {
    return full.length > maxLength
      ? `${full.substring(0, maxLength - 1)}…`
      : full;
  }

  const padded = `${full}   `;
  const doubled = padded + padded;
  return doubled.substring(offset, offset + maxLength);
}
