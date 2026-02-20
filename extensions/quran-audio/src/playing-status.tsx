import { MenuBarExtra, Icon, LocalStorage, launchCommand, LaunchType } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { stopAudio } from "./lib/audio";

export default function Command() {
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
    };
  });

  async function handleStop() {
    await stopAudio();
    await LocalStorage.removeItem("currently_playing");
    await mutate(undefined);
  }

  const icon = playingInfo ? { source: "menu-icon.svg" } : { source: "menu-icon.svg" };

  return (
    <MenuBarExtra
      icon={icon}
      title={playingInfo ? playingInfo.surah : undefined}
      isLoading={isLoading}
      tooltip={playingInfo ? `Playing: ${playingInfo.surah} (${playingInfo.reciter})` : "Quran Audio"}
    >
      {playingInfo ? (
        <>
          <MenuBarExtra.Section title="Currently Playing">
            <MenuBarExtra.Item title={playingInfo.surah} subtitle={playingInfo.reciter} icon={Icon.Play} />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
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
