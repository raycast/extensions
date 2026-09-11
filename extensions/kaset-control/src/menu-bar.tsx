import {
  Icon,
  LocalStorage,
  MenuBarExtra,
  open,
  LaunchType,
  launchCommand,
  getPreferenceValues,
  environment,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getKasetState, isKasetRunning, KasetState } from "./utils/kaset";

const MENU_BAR_ENABLED_KEY = "menuBarEnabled";

async function fetchState() {
  const running = await isKasetRunning();
  return running ? await getKasetState() : null;
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

  // If disabled (either by local state or persisted), hide the menu bar
  if (isHidden || data?.enabled === false) {
    return null;
  }

  const state = data?.state;
  const title = getMenuBarTitle(state);

  return (
    <MenuBarExtra icon={Icon.Music} title={title} isLoading={isLoading}>
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

function getMenuBarTitle(
  state: KasetState | null | undefined,
): string | undefined {
  const { menuBarStyle } = getPreferenceValues<Preferences>();

  if (menuBarStyle === "icon") {
    return undefined;
  }

  if (!state?.currentTrack) {
    return undefined;
  }

  const maxLengthMap = {
    short: 20,
    medium: 35,
    long: 50,
  };
  const maxLength = maxLengthMap[menuBarStyle] || 20;

  const { name, artist } = state.currentTrack;
  const title = `${name} - ${artist}`;

  if (title.length > maxLength) {
    return title.substring(0, maxLength - 1) + "…";
  }

  return title;
}
