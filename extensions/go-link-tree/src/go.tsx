import type { LaunchProps } from "@raycast/api";
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
import type { GoLinkConfig, Link } from "./types";

interface GoArguments {
  query?: string;
}

export default function Command(
  props: LaunchProps<{ arguments: GoArguments }>
) {
  const { query: initialQuery } = props.arguments;
  const [searchText, setSearchText] = useState(initialQuery || "");
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
          if (watcherRef.current) {
            watcherRef.current.close();
          }

          watcherRef.current = fs.watch(
            configPath,
            { persistent: false },
            (eventType, filename) => {
              if (eventType === "change" && filename) {
                if (debounceTimer) {
                  clearTimeout(debounceTimer);
                }
                debounceTimer = setTimeout(() => {
                  reloadConfig();
                  debounceTimer = null;
                }, 300);
              } else if (eventType === "rename") {
                setTimeout(() => {
                  reloadConfig();
                  if (fs.existsSync(configPath)) {
                    setupWatcher();
                  }
                }, 500);
              }
            }
          );
        }
      } catch (err) {
        console.error("Failed to set up file watcher:", err);
      }
    };

    setupWatcher();

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

  // Filter links based on search text
  const getFilteredLinks = useCallback(() => {
    if (!config) return [];

    const allLinks: { link: Link; groupTitle: string }[] = [];
    for (const group of config.groups) {
      for (const link of group.links) {
        allLinks.push({ link, groupTitle: group.title });
      }
    }

    if (!searchText) return allLinks;

    const query = searchText.toLowerCase();
    return allLinks.filter(({ link }) => {
      const titleMatch = link.title.toLowerCase().includes(query);
      const urlMatch = link.url.toLowerCase().includes(query);
      const keywordsMatch = link.keywords?.some((kw) =>
        kw.toLowerCase().includes(query)
      );
      return titleMatch || urlMatch || keywordsMatch;
    });
  }, [config, searchText]);

  const configPath = getConfigPath();
  const filteredLinks = getFilteredLinks();

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
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type to filter links..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {filteredLinks.map(({ link, groupTitle }, index) => (
        <LinkItem
          key={`${link.url}-${index}`}
          link={link}
          groupTitle={groupTitle}
          defaultBrowser={config?.settings?.defaultBrowser}
          defaultProfile={config?.settings?.defaultProfile}
        />
      ))}
      {filteredLinks.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Links Found"
          description={
            searchText
              ? `No links match "${searchText}"`
              : "No links configured"
          }
        />
      )}
    </List>
  );
}
