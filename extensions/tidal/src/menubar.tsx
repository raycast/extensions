"use client";

import { MenuBarExtra, Icon } from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  type Track,
  type ServerConnectionStatus,
  refreshData,
  createCommandHandler,
  showServerStatusCmd,
  manualStartServer,
  manualStopServer,
  getServerStatus,
  getRepeatIcon,
  showDocsCmd,
  getRepeatTitle,
  getMenubarTitle,
  editPreferencesCmd,
  formatUptime,
} from "./lib/utils";

export default function Command() {
  const [currentTrack, setCurrentTrack] = useState<Track>({
    title: "Loading...",
    artist: "Connecting...",
    isPlaying: false,
    playingFrom: "",
    currentTime: "0:00",
    duration: "0:00",
    isLiked: false,
    isShuffled: false,
    repeatMode: "off",
  });
  const [hasRealData, setHasRealData] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerConnectionStatus>("connecting");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [serverUptime, setServerUptime] = useState<number>(0);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleRefreshData = useCallback(async () => {
    const result = await refreshData();
    setCurrentTrack(result.track);
    setHasRealData(result.hasRealData);
    setServerStatus(result.serverStatus);
    if (result.serverStatus === "connected") {
      setLastUpdate(new Date());
      const status = await getServerStatus();
      if (status) {
        setServerUptime(status.uptime);
      }
    } else {
      setLastUpdate(null);
      setServerUptime(0);
    }
  }, []);

  useEffect(() => {
    handleRefreshData();
    refreshIntervalRef.current = setInterval(handleRefreshData, 5000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [handleRefreshData]);

  const playPause = useCallback(async () => {
    const newIsPlaying = !currentTrack.isPlaying;
    setCurrentTrack((prev) => ({ ...prev, isPlaying: newIsPlaying }));
    const handler = createCommandHandler(newIsPlaying ? "play" : "pause", serverStatus, handleRefreshData);
    await handler();
  }, [currentTrack.isPlaying, serverStatus, handleRefreshData]);

  const nextTrack = useCallback(
    () => createCommandHandler("next", serverStatus, handleRefreshData)(),
    [serverStatus, handleRefreshData],
  );

  const previousTrack = useCallback(
    () => createCommandHandler("previous", serverStatus, handleRefreshData)(),
    [serverStatus, handleRefreshData],
  );

  const toggleLike = useCallback(async () => {
    setCurrentTrack((prev) => ({ ...prev, isLiked: !prev.isLiked }));
    const handler = createCommandHandler("toggleLike", serverStatus, handleRefreshData);
    await handler();
  }, [serverStatus, handleRefreshData]);

  const toggleShuffle = useCallback(async () => {
    setCurrentTrack((prev) => ({ ...prev, isShuffled: !prev.isShuffled }));
    const handler = createCommandHandler("toggleShuffle", serverStatus, handleRefreshData);
    await handler();
  }, [serverStatus, handleRefreshData]);

  const toggleRepeat = useCallback(
    () => createCommandHandler("toggleRepeat", serverStatus, handleRefreshData)(),
    [serverStatus, handleRefreshData],
  );

  const handleManualStartServer = useCallback(() => {
    setServerStatus("connecting");
    manualStartServer(handleRefreshData);
  }, [handleRefreshData]);

  const handleManualStopServer = useCallback(async () => {
    setServerStatus("connecting");
    await manualStopServer();
  }, [handleRefreshData]);

  const menubarTitle = getMenubarTitle(hasRealData, currentTrack, serverStatus);
  const repeatIcon = getRepeatIcon(currentTrack.repeatMode);
  const repeatTitle = getRepeatTitle(currentTrack.repeatMode);

  return (
    <MenuBarExtra
      icon={currentTrack?.isPlaying ? Icon.Pause : Icon.Play}
      title={menubarTitle}
      isLoading={serverStatus === "connecting"}
      tooltip={hasRealData && currentTrack ? `${currentTrack.title} - ${currentTrack.artist}` : "Tidal Controller"}
    >
      {hasRealData && currentTrack ? (
        <>
          <MenuBarExtra.Section title="Current Track">
            <MenuBarExtra.Item title={currentTrack.title} icon={currentTrack.isLiked ? Icon.Heart : Icon.Music} />
            <MenuBarExtra.Item title={currentTrack.artist} icon={Icon.Person} />
            <MenuBarExtra.Item title={`${currentTrack.currentTime} / ${currentTrack.duration}`} icon={Icon.Clock} />
            {currentTrack.playingFrom && <MenuBarExtra.Item title={currentTrack.playingFrom} icon={Icon.List} />}
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Playback Controls">
            <MenuBarExtra.Item
              title="Previous"
              icon={Icon.Rewind}
              onAction={previousTrack}
              shortcut={{ modifiers: ["cmd"], key: "q" }}
            />
            <MenuBarExtra.Item
              title={currentTrack.isPlaying ? "Pause" : "Play"}
              icon={currentTrack.isPlaying ? Icon.Pause : Icon.Play}
              onAction={playPause}
              shortcut={{ modifiers: ["cmd"], key: "w" }}
            />
            <MenuBarExtra.Item
              title="Next"
              icon={Icon.Forward}
              onAction={nextTrack}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Track Actions">
            <MenuBarExtra.Item
              title={currentTrack.isLiked ? "Unlike" : "Like"}
              icon={currentTrack.isLiked ? Icon.HeartDisabled : Icon.Heart}
              onAction={toggleLike}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <MenuBarExtra.Item
              title={`Shuffle: ${currentTrack.isShuffled ? "On" : "Off"}`}
              icon={currentTrack.isShuffled ? Icon.Shuffle : Icon.List}
              onAction={toggleShuffle}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
            <MenuBarExtra.Item
              title={repeatTitle}
              icon={Icon[repeatIcon as keyof typeof Icon]}
              onAction={toggleRepeat}
              shortcut={{ modifiers: ["cmd"], key: "y" }}
            />
          </MenuBarExtra.Section>
        </>
      ) : (
        <MenuBarExtra.Section title="Status">
          {serverStatus === "disconnected" ? (
            <MenuBarExtra.Item title="Server Offline" icon={Icon.XMarkCircle} />
          ) : (
            <MenuBarExtra.Item title="No Track Playing" icon={Icon.Music} />
          )}
          <MenuBarExtra.Item title="Open Documentation" icon={Icon.Book} onAction={showDocsCmd} />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Submenu title="Server" icon={Icon.ComputerChip}>
          {serverStatus === "connected" ? (
            <MenuBarExtra.Item
              title="Connected (Click to Stop)"
              icon={Icon.CheckCircle}
              onAction={handleManualStopServer}
            />
          ) : (
            <MenuBarExtra.Item
              title={serverStatus === "connecting" ? "Connecting..." : "Disconnected (Click to Start)"}
              icon={serverStatus === "connecting" ? Icon.Clock : Icon.XMarkCircle}
              onAction={handleManualStartServer}
            />
          )}

          <MenuBarExtra.Item title="View Server Status Details" icon={Icon.BarChart} onAction={showServerStatusCmd} />
          <MenuBarExtra.Item title="Launch Extension Preferences" icon={Icon.Gear} onAction={editPreferencesCmd} />

          {serverStatus === "connected" && lastUpdate && (
            <MenuBarExtra.Item title={`Last Updated: ${lastUpdate.toLocaleTimeString()}`} icon={Icon.Clock} />
          )}
          {serverStatus === "connected" && serverUptime > 0 && (
            <MenuBarExtra.Item title={`Uptime: ${formatUptime(serverUptime)}`} icon={Icon.Hourglass} />
          )}
        </MenuBarExtra.Submenu>
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
