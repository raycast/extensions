import {
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  openExtensionPreferences,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { checkConnection, fetchTasks } from "./api/client";
import { Preferences } from "./types";
import { getCachedTasks, isCacheValid } from "./cache";

export default function CheckConnection() {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedTaskCount, setCachedTaskCount] = useState<number | null>(null);
  const [cacheAgeMinutes, setCacheAgeMinutes] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    let cancelled = false;

    async function performCheck() {
      try {
        const result = await checkConnection();
        if (cancelled) return;
        setIsConnected(result.connected);
        if (result.error) {
          setError(result.error);
        }
        if (result.connected) {
          const tasks = await fetchTasks({ completed: false });
          if (cancelled) return;
          await showToast({
            style: Toast.Style.Success,
            title: `Connected - cached ${tasks.length} tasks`,
          });
        } else {
          const cacheValid = await isCacheValid();
          if (cacheValid) {
            const cached = await getCachedTasks();
            if (cached && !cancelled) {
              setCachedTaskCount(cached.length);
              const timestampStr = await import("@raycast/api").then((m) =>
                m.LocalStorage.getItem<string>("tasknotes_tasks_timestamp"),
              );
              if (timestampStr && !cancelled) {
                const timestamp = parseInt(timestampStr, 10);
                const ageMs = Date.now() - timestamp;
                setCacheAgeMinutes(Math.floor(ageMs / 60000));
              }
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Connection failed");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    performCheck();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  function retry() {
    setIsLoading(true);
    setError(null);
    setIsConnected(false);
    setCachedTaskCount(null);
    setCacheAgeMinutes(null);
    setRetryCount((c) => c + 1);
  }

  if (isLoading) {
    return <Detail isLoading={true} markdown="Checking connection..." />;
  }

  if (!isConnected || error) {
    let markdown = "";
    const debugUrl = `http://127.0.0.1:${preferences.apiPort}/api/tasks?limit=1`;

    if (cachedTaskCount !== null) {
      const ageText =
        cacheAgeMinutes === 0
          ? "less than a minute"
          : `${cacheAgeMinutes} minute${cacheAgeMinutes === 1 ? "" : "s"}`;
      markdown = `# Connection Unavailable

Unable to connect to TaskNotes API at **localhost:${preferences.apiPort}**

## Cached Data Available

You have **${cachedTaskCount} tasks** cached from ${ageText} ago. Some commands may still work with cached data.

## Troubleshooting

1. Ensure Obsidian is running
2. Ensure TaskNotes plugin is installed and enabled
3. Ensure TaskNotes HTTP API is enabled in plugin settings
4. Verify the port number matches TaskNotes settings (default: 8080)

Use the action below to update your preferences if needed.`;
    } else {
      markdown = `# Connection Failed

Unable to connect to TaskNotes API at **localhost:${preferences.apiPort}**

**Debug URL:** \`${debugUrl}\`

${error ? `**Error:** ${error}` : ""}

## Troubleshooting

1. Ensure Obsidian is running
2. Ensure TaskNotes plugin is installed and enabled
3. Ensure TaskNotes HTTP API is enabled in plugin settings
4. Verify the port number matches TaskNotes settings (default: 8080)

Use the action below to update your preferences if needed.`;
    }

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              onAction={openExtensionPreferences}
            />
            <Action title="Retry" onAction={retry} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      markdown={`# Connected to TaskNotes

Successfully connected to TaskNotes API at **localhost:${preferences.apiPort}**

You're all set to use TaskNotes commands.`}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
