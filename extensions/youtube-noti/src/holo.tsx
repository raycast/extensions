import {
  ActionPanel,
  Action,
  Grid,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  Image,
  openExtensionPreferences,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import * as fs from "fs";
import { getLiveStreams, LiveStream } from "./youtube";

interface Preferences {
  apiKey: string;
  channelIds: string;
  channelIdsFile?: string;
  viewMode?: string;
  sortBy?: string;
}

function readFileSyncSafe(path: string): string | null {
  try {
    return fs.readFileSync(path.trim(), "utf-8");
  } catch {
    return null;
  }
}

function getChannelIdsRaw(prefs: Preferences): string {
  if (prefs.channelIdsFile?.trim()) {
    const content = readFileSyncSafe(prefs.channelIdsFile);
    if (content) return content;
  }
  return prefs.channelIds ?? "";
}

function formatViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatStreamDuration(actualStartTime?: string): string {
  if (!actualStartTime) return "";
  try {
    const start = new Date(actualStartTime).getTime();
    const now = Date.now();
    const ms = Math.max(0, now - start);
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    if (hr > 0) return `${hr}h ${min % 60}m`;
    if (min > 0) return `${min}m`;
    return `${sec}s`;
  } catch {
    return "";
  }
}

function sortStreams(streams: LiveStream[], sortBy: string): LiveStream[] {
  const arr = [...streams];
  if (sortBy === "duration") {
    arr.sort((a, b) => {
      const tA = a.actualStartTime ? new Date(a.actualStartTime).getTime() : 0;
      const tB = b.actualStartTime ? new Date(b.actualStartTime).getTime() : 0;
      return tB - tA;
    });
  } else if (sortBy === "channel") {
    arr.sort((a, b) =>
      (a.channelTitle || "").localeCompare(b.channelTitle || ""),
    );
  } else {
    arr.sort((a, b) => b.viewerCount - a.viewerCount);
  }
  return arr;
}

function Command() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const prefs = getPreferenceValues<Preferences>();
  const channelIdsRaw = getChannelIdsRaw(prefs);
  const viewMode = prefs.viewMode === "list" ? "list" : "grid";
  const sortBy = prefs.sortBy || "viewers";

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const list = await getLiveStreams(prefs.apiKey, channelIdsRaw);
        if (!cancelled) {
          setStreams(sortStreams(list, sortBy));
          if (list.length > 0) {
            await showToast({
              style: Toast.Style.Success,
              title: `${list.length} live`,
              message: "From your list",
            });
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) {
          setError(msg);
          setStreams([]);
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load",
            message: msg.slice(0, 60),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [prefs.apiKey, channelIdsRaw, refreshKey, sortBy]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const hasFileSet = !!prefs.channelIdsFile?.trim();
  const fileReadFailed = hasFileSet && !channelIdsRaw?.trim();
  const needsSetup = !prefs.apiKey?.trim() || !channelIdsRaw?.trim();

  if (needsSetup) {
    const title = fileReadFailed
      ? "Could not read Channel IDs file"
      : "API key and Channel IDs required";
    const description = fileReadFailed
      ? "Check that the file path in preferences is correct and the file exists. Or paste channel IDs in the Channel IDs box instead."
      : "Press Enter to open Extension Preferences. Set API Key and either Channel IDs or Channel IDs file. In Settings, click YouTube Noti then Stream to see the fields.";
    return (
      <List>
        <List.EmptyView
          icon={Icon.Key}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't load streams"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const streamActions = (s: LiveStream) => (
    <ActionPanel>
      <Action.OpenInBrowser url={s.url} title="Open Stream" />
      <Action.CopyToClipboard
        content={s.url}
        title="Copy Link"
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.CopyToClipboard
        content={`${s.channelTitle} – ${s.title}`}
        title="Copy Title (Channel – Title)"
      />
      <Action.OpenInBrowser
        url={`https://www.youtube.com/channel/${s.channelId}`}
        title="Open Channel"
        icon={Icon.Person}
      />
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );

  const renderItem = (s: LiveStream) => {
    const duration = formatStreamDuration(s.actualStartTime);
    const subtitle = [
      s.channelTitle,
      duration && `Live ${duration}`,
      `🔴 ${formatViewers(s.viewerCount)}`,
    ]
      .filter(Boolean)
      .join(" · ");
    const content = {
      source: s.thumbnail || Icon.Video,
      mask: Image.Mask.RoundedRectangle,
    };
    if (viewMode === "list") {
      return (
        <List.Item
          key={s.id}
          icon={content}
          title={s.title}
          subtitle={subtitle}
          accessories={[{ text: `🔴 ${formatViewers(s.viewerCount)}` }]}
          keywords={[s.channelTitle, s.title]}
          actions={streamActions(s)}
        />
      );
    }
    return (
      <Grid.Item
        key={s.id}
        content={content}
        title={s.title}
        subtitle={subtitle}
        keywords={[s.channelTitle, s.title]}
        actions={streamActions(s)}
      />
    );
  };

  if (viewMode === "list") {
    return (
      <List
        isLoading={loading}
        searchBarPlaceholder="Search by title or channel..."
        throttle
      >
        {!loading && streams.length === 0 && (
          <List.EmptyView
            icon={Icon.Video}
            title="No one is live"
            description="None of your channels are streaming right now. Add more in preferences or try again later."
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refresh}
                />
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                />
              </ActionPanel>
            }
          />
        )}
        {streams.map(renderItem)}
      </List>
    );
  }

  return (
    <Grid
      isLoading={loading}
      searchBarPlaceholder="Search by title or channel..."
      throttle
      columns={4}
      inset={Grid.Inset.Medium}
      fit={Grid.Fit.Fill}
    >
      {!loading && streams.length === 0 && (
        <Grid.EmptyView
          icon={Icon.Video}
          title="No one is live"
          description="None of your channels are streaming right now. Add more in preferences or try again later."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}
      {streams.map(renderItem)}
    </Grid>
  );
}

export default Command;
