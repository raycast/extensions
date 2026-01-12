import {
  List,
  Icon,
  showToast,
  Toast,
  ActionPanel,
  Action,
} from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import * as fs from "fs";
import { loadConfig, getConfigPath } from "./lib/config";
import { LinkItem } from "./components/LinkItem";
import type { GoLinkConfig } from "./types";

export default function Command() {
  const [config, setConfig] = useState<GoLinkConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const watcherRef = useRef<fs.FSWatcher | null>(null);

  const reloadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedConfig = await loadConfig();
      setConfig(loadedConfig);
      setError(null);
      showToast({
        style: Toast.Style.Success,
        title: "Configuration Reloaded",
        message: `Loaded ${loadedConfig.groups.reduce((sum, g) => sum + g.links.length, 0)} links`,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load configuration";
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    reloadConfig();

    // Set up file watcher for hot-reload
    const configPath = getConfigPath();
    let debounceTimer: NodeJS.Timeout | null = null;

    const setupWatcher = () => {
      try {
        if (fs.existsSync(configPath)) {
          // Close existing watcher if any
          if (watcherRef.current) {
            watcherRef.current.close();
          }

          watcherRef.current = fs.watch(
            configPath,
            { persistent: false },
            (eventType, filename) => {
              if (eventType === "change" && filename) {
                // Debounce rapid changes (e.g., when saving in editor)
                if (debounceTimer) {
                  clearTimeout(debounceTimer);
                }
                debounceTimer = setTimeout(() => {
                  reloadConfig();
                  debounceTimer = null;
                }, 300);
              } else if (eventType === "rename") {
                // File was deleted or moved - try to reload (will show error if file doesn't exist)
                setTimeout(() => {
                  reloadConfig();
                  // Try to re-setup watcher if file exists again
                  if (fs.existsSync(configPath)) {
                    setupWatcher();
                  }
                }, 500);
              }
            }
          );
        }
      } catch (err) {
        // File watching failed, but don't block the extension
        console.error("Failed to set up file watcher:", err);
      }
    };

    setupWatcher();

    // Cleanup watcher on unmount
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (watcherRef.current) {
        watcherRef.current.close();
        watcherRef.current = null;
      }
    };
  }, [reloadConfig]);

  const configPath = getConfigPath();

  if (error) {
    return (
      <List>
        <List.Item
          icon={Icon.ExclamationMark}
          title="Configuration Error"
          subtitle={error}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowClockwise}
                title="Reload Configuration"
                onAction={reloadConfig}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.Open
                title="Edit Configuration File"
                target={configPath}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action.ShowInFinder
                title="Show Configuration File in Finder"
                path={configPath}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search links...">
      {/* Configuration management item - always visible at the top */}
      <List.Section title="Configuration">
        <List.Item
          icon={Icon.Gear}
          title="Configuration Settings"
          subtitle={`Config: ${configPath.split("/").pop()}`}
          keywords={["config", "settings", "reload", "edit"]}
          actions={
            <ActionPanel>
              <Action.Open
                icon={Icon.Document}
                title="Edit Configuration File"
                target={configPath}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action
                icon={Icon.ArrowClockwise}
                title="Reload Configuration"
                onAction={reloadConfig}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.ShowInFinder
                icon={Icon.Folder}
                title="Show Configuration File in Finder"
                path={configPath}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Link groups */}
      {config?.groups.map((group) => (
        <List.Section
          key={group.name}
          title={group.title}
          subtitle={`${group.links.length} link${group.links.length !== 1 ? "s" : ""}`}
        >
          {group.links.map((link, index) => (
            <LinkItem
              key={`${link.url}-${index}`}
              link={link}
              groupTitle={group.title}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
