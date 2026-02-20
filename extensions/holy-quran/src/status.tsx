import { MenuBarExtra, Icon, LocalStorage, launchCommand, LaunchType, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { stopAudio, pauseAudio, resumeAudio } from "./lib/audio";
import { useRef } from "react";

export default function Command() {
  const isProcessing = useRef(false);
  const {
    data: playingInfo,
    isLoading,
    mutate,
  } = useCachedPromise(async () => {
    const item = await LocalStorage.getItem<string>("currently_playing");
    if (!item) return null;
    return JSON.parse(item) as {
      surah: string;
      reciter: string;
      startTime: number;
      isPaused?: boolean;
    };
  });

  async function handleStop() {
    await stopAudio();
    await LocalStorage.removeItem("currently_playing");
    await mutate(undefined);
  }

  async function handleTogglePause() {
    if (!playingInfo || isProcessing.current) return;
    isProcessing.current = true;

    try {
      if (playingInfo.isPaused) {
        await resumeAudio();
      } else {
        await pauseAudio();
      }

      const updatedInfo = { ...playingInfo, isPaused: !playingInfo.isPaused };
      await LocalStorage.setItem("currently_playing", JSON.stringify(updatedInfo));
      await mutate(Promise.resolve(updatedInfo));
    } finally {
      isProcessing.current = false;
    }
  }

  const icon = {
    source: "icons/menu-icon.svg",
    tintColor: playingInfo ? (playingInfo.isPaused ? Color.Yellow : Color.Green) : undefined,
  };

  const statusPrefix = playingInfo?.isPaused ? "[Paused] " : "Playing: ";

  return (
    <MenuBarExtra
      icon={icon}
      title={playingInfo ? playingInfo.surah : undefined}
      isLoading={isLoading}
      tooltip={playingInfo ? `${statusPrefix}${playingInfo.surah} (${playingInfo.reciter})` : "Holy Quran"}
    >
      {playingInfo ? (
        <>
          <MenuBarExtra.Section title="Currently Playing">
            <MenuBarExtra.Item
              title={playingInfo.surah}
              subtitle={playingInfo.reciter}
              icon={playingInfo.isPaused ? Icon.Pause : Icon.Play}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={playingInfo.isPaused ? "Resume Recitation" : "Pause Recitation"}
              icon={playingInfo.isPaused ? Icon.Play : Icon.Pause}
              onAction={handleTogglePause}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            />
            <MenuBarExtra.Item
              title="Stop Playback"
              icon={Icon.Stop}
              onAction={handleStop}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          </MenuBarExtra.Section>
        </>
      ) : (
        <MenuBarExtra.Item title="No Audio Playing" icon={Icon.Circle} />
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Browse Surahs"
          icon={Icon.Book}
          onAction={() => launchCommand({ name: "play-surah", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Change Reciter"
          icon={Icon.Person}
          onAction={() => launchCommand({ name: "set-default-reciter", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
