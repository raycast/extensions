import { Action, ActionPanel, List, showToast, Toast, Icon, Color, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { getCurrentPlayerState } from "../services/applescript/index";
import { getQueueStats, clearQueue, processQueue } from "../services/scrobble/index";
import { getSessionKey } from "../utils/storage";
import type { TrackInfo, PlayerState } from "../services/applescript/types";

interface ScrobbleState {
  lastTrack: TrackInfo | null;
  trackStartTime: number;
  scrobbleThreshold: number;
  hasScrobbled: boolean;
  hasUpdatedNowPlaying: boolean;
  readyToScrobble: boolean;
  playerName?: string;
}

interface QueueStats {
  total: number;
  pending: number;
  failed: number;
  processing: boolean;
}

export default function Command() {
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [scrobbleState, setScrobbleState] = useState<ScrobbleState | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionKey, setSessionKey] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load session key
      const key = await getSessionKey();
      setSessionKey(key);

      // Load current player state
      const currentPlayer = await getCurrentPlayerState();
      setPlayerState(currentPlayer);

      // Load background scrobble state
      const stored = await LocalStorage.getItem<string>("background_scrobble_state");
      if (stored) {
        setScrobbleState(JSON.parse(stored));
      }

      // Load queue statistics
      const stats = await getQueueStats();
      setQueueStats(stats);
    } catch (error) {
      console.error("Error loading scrobbling data:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to load scrobbling data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProcessQueue = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Processing Queue",
        message: "Processing pending scrobbles...",
      });

      const result = await processQueue();
      if (result.success && result.accepted && result.accepted > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "Queue Processed",
          message: `${result.accepted} scrobbles processed successfully`,
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Queue Empty",
          message: "No pending scrobbles to process",
        });
      }

      // Reload data to update queue stats
      await loadData();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to process queue",
      });
    }
  };

  const handleClearQueue = async () => {
    try {
      await clearQueue();
      await showToast({
        style: Toast.Style.Success,
        title: "Queue Cleared",
        message: "All queued scrobbles have been removed",
      });

      // Reload data to update queue stats
      await loadData();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to clear queue",
      });
    }
  };

  const getCurrentTrackProgress = (): { playedSeconds: number; percentage: number } | null => {
    if (!scrobbleState?.lastTrack || !scrobbleState.trackStartTime) return null;

    const now = Date.now();
    const playedSeconds = Math.floor((now - scrobbleState.trackStartTime) / 1000);
    const percentage = Math.round((playedSeconds / scrobbleState.lastTrack.duration) * 100);

    return { playedSeconds, percentage };
  };

  const getStatusColor = (): Color => {
    if (!sessionKey) return Color.Red;
    if (!playerState?.isPlaying) return Color.SecondaryText;
    if (scrobbleState?.readyToScrobble) return Color.Green;
    return Color.Blue;
  };

  const getStatusText = (): string => {
    if (!sessionKey) return "⚠️ Not authenticated for scrobbling";
    if (!playerState?.isPlaying) return "⏸️ No music playing";
    if (scrobbleState?.readyToScrobble) return "✅ Ready to scrobble";
    if (scrobbleState?.lastTrack) return "🎵 Tracking progress";
    return "⏹️ Idle";
  };

  const progress = getCurrentTrackProgress();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Scrobbling status and queue management">
      {/* Current Status Section */}
      <List.Section title="Current Status">
        <List.Item
          title={getStatusText()}
          subtitle={playerState?.playerName ? `Player: ${playerState.playerName}` : undefined}
          icon={{ source: Icon.Circle, tintColor: getStatusColor() }}
          accessories={[
            {
              text: sessionKey ? "Authenticated" : "Not authenticated",
              icon: sessionKey ? Icon.CheckCircle : Icon.XMarkCircle,
            },
          ]}
        />
      </List.Section>

      {/* Current Track Section */}
      {playerState?.isPlaying && playerState.track && (
        <List.Section title="Now Playing">
          <List.Item
            title={playerState.track.name}
            subtitle={`${playerState.track.artist} — ${playerState.track.album}`}
            icon={Icon.Music}
            accessories={[
              {
                text: progress
                  ? `${Math.floor(progress.playedSeconds / 60)}:${(progress.playedSeconds % 60)
                      .toString()
                      .padStart(2, "0")} (${progress.percentage}%)`
                  : `${Math.floor(playerState.track.duration / 60)}:${(playerState.track.duration % 60)
                      .toString()
                      .padStart(2, "0")}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Refresh" onAction={loadData} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            }
          />
          {scrobbleState?.scrobbleThreshold && (
            <List.Item
              title="Scrobble Threshold"
              subtitle={`Will scrobble after ${scrobbleState.scrobbleThreshold} seconds (50% or 4 minutes)`}
              icon={Icon.BullsEye}
              accessories={[
                {
                  text: scrobbleState.readyToScrobble ? "✅ Threshold reached" : "⏳ In progress",
                  icon: scrobbleState.readyToScrobble ? Icon.CheckCircle : Icon.Clock,
                },
              ]}
            />
          )}
        </List.Section>
      )}

      {/* Queue Management Section */}
      <List.Section title="Scrobble Queue">
        <List.Item
          title="Queue Statistics"
          subtitle={
            queueStats
              ? `${queueStats.total} total • ${queueStats.pending} pending • ${queueStats.failed} failed`
              : "Loading..."
          }
          icon={Icon.List}
          accessories={[
            {
              text: queueStats?.processing ? "Processing..." : "Idle",
              icon: queueStats?.processing ? Icon.ArrowClockwise : Icon.Pause,
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={loadData} icon={Icon.ArrowClockwise} />
              {queueStats && queueStats.total > 0 && (
                <>
                  <Action
                    title="Process Queue"
                    onAction={handleProcessQueue}
                    icon={Icon.Play}
                    shortcut={{ modifiers: ["cmd"], key: "p" }}
                  />
                  <Action
                    title="Clear Queue"
                    onAction={handleClearQueue}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </>
              )}
            </ActionPanel>
          }
        />

        {queueStats && queueStats.total > 0 && (
          <>
            {queueStats.pending > 0 && (
              <List.Item
                title="Pending Scrobbles"
                subtitle={`${queueStats.pending} tracks waiting to be scrobbled`}
                icon={{ source: Icon.Clock, tintColor: Color.Yellow }}
              />
            )}
            {queueStats.failed > 0 && (
              <List.Item
                title="Failed Scrobbles"
                subtitle={`${queueStats.failed} tracks failed and will be retried`}
                icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              />
            )}
          </>
        )}

        {(!queueStats || queueStats.total === 0) && (
          <List.Item
            title="Queue Empty"
            subtitle="No pending scrobbles"
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          />
        )}
      </List.Section>

      {/* Quick Actions Section */}
      <List.Section title="Quick Actions">
        <List.Item
          title="Process Queue Now"
          subtitle="Manually process any pending scrobbles"
          icon={Icon.Play}
          actions={
            <ActionPanel>
              <Action title="Process Queue" onAction={handleProcessQueue} icon={Icon.Play} />
              <Action title="Refresh" onAction={loadData} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Refresh Status"
          subtitle="Update all scrobbling information"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={loadData} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
