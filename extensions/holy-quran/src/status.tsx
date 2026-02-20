import { MenuBarExtra, Icon, LocalStorage, launchCommand, LaunchType, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { stopPlayback, togglePause } from "./lib/control";
import { PlayingInfo } from "./types";
import { useRef, useState, useEffect } from "react";

export default function Command() {
  const isProcessing = useRef(false);
  const [elapsed, setElapsed] = useState<number>(0);
  const [remaining, setRemaining] = useState<number | null>(null);

  const {
    data: playingInfo,
    isLoading,
    mutate,
  } = useCachedPromise(async () => {
    const item = await LocalStorage.getItem<string>("currently_playing");
    if (!item) return null;
    return JSON.parse(item) as PlayingInfo;
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateTime = () => {
      if (!playingInfo) return;

      const now = playingInfo.isPaused && playingInfo.lastPausedAt ? playingInfo.lastPausedAt : Date.now();
      const basePausedTime = playingInfo.pausedTime || 0;
      const totalElapsedMs = now - playingInfo.startTime - basePausedTime;
      const elapsedSeconds = Math.max(0, Math.floor(totalElapsedMs / 1000));

      setElapsed(elapsedSeconds);

      if (playingInfo.duration && playingInfo.duration > 0) {
        setRemaining(Math.max(0, Math.round(playingInfo.duration - elapsedSeconds)));
      } else {
        setRemaining(null);
      }
    };

    updateTime();

    if (playingInfo && !playingInfo.isPaused) {
      interval = setInterval(updateTime, 1000);
    }

    return () => clearInterval(interval);
  }, [playingInfo]);

  function formatTime(seconds: number) {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${seconds < 0 ? "-" : ""}${mins}:${secs.toString().padStart(2, "0")}`;
  }

  async function handleStop() {
    await stopPlayback();
    setRemaining(null);
    await mutate(undefined);
  }

  async function handleTogglePause() {
    if (!playingInfo || isProcessing.current) return;
    isProcessing.current = true;

    try {
      const updated = await togglePause();
      if (updated) {
        await mutate(Promise.resolve(updated));
      }
    } finally {
      isProcessing.current = false;
    }
  }

  const icon = {
    source: "icons/menu-icon.svg",
    tintColor: playingInfo ? (playingInfo.isPaused ? Color.Yellow : Color.Green) : undefined,
  };

  const statusPrefix = playingInfo?.isPaused ? "[Paused] " : "Playing: ";
  const timeDisplay = remaining !== null ? formatTime(remaining) : formatTime(elapsed);
  const timeStr = playingInfo ? ` (${timeDisplay})` : "";

  return (
    <MenuBarExtra
      icon={icon}
      title={playingInfo ? `${playingInfo.surah}${timeStr}` : undefined}
      isLoading={isLoading}
      tooltip={playingInfo ? `${statusPrefix}${playingInfo.surah} (${playingInfo.reciter})` : "Holy Quran"}
    >
      {playingInfo ? (
        <>
          <MenuBarExtra.Section title="Currently Playing">
            <MenuBarExtra.Item
              title={playingInfo.surah}
              subtitle={`${playingInfo.reciter}${timeStr ? ` • ${timeStr} remaining` : ""}`}
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
      <MenuBarExtra.Section title="Explore">
        <MenuBarExtra.Item
          title="Browse Surahs"
          icon={Icon.Book}
          onAction={() => launchCommand({ name: "search-surah", type: LaunchType.UserInitiated })}
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
