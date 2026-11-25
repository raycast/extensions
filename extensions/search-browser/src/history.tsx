import { Action, ActionPanel, Icon, List, closeMainWindow } from "@raycast/api";
import { showFailureToast, usePromise, runAppleScript } from "@raycast/utils";
import { readFile } from "node:fs/promises";
import path from "node:path";

const SEARCH_BROWSER_BUNDLE_ID = "com.officecommun.search";
const SEARCH_SUPPORT_DIRECTORY = path.join(
  process.env.HOME ?? "",
  "Library",
  "Application Support",
  "Search",
);
const SEARCH_ICONS_DIRECTORY = path.join(SEARCH_SUPPORT_DIRECTORY, "icons");

interface HistoryEntry {
  url: string;
  title: string;
  last: number;
  count?: number;
}

interface PageIcon {
  dark?: string;
}

type IconIndex = Record<string, Record<string, PageIcon>>;

async function loadHistory(): Promise<HistoryEntry[]> {
  const historyFile = path.join(SEARCH_SUPPORT_DIRECTORY, "history.json");
  const rawHistory = await readFile(historyFile, "utf8");
  const entries = JSON.parse(rawHistory) as HistoryEntry[];

  return entries
    .filter((entry) => {
      try {
        const url = new URL(entry.url);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.last - a.last);
}

async function loadIconIndex(): Promise<IconIndex> {
  try {
    const indexFile = path.join(SEARCH_ICONS_DIRECTORY, "pages.json");
    const rawIndex = await readFile(indexFile, "utf8");
    return JSON.parse(rawIndex) as IconIndex;
  } catch {
    return {};
  }
}

function faviconPath(
  entry: HistoryEntry,
  iconIndex: IconIndex,
): string | undefined {
  try {
    const url = new URL(entry.url);
    const hostIcons = iconIndex[url.hostname];
    const iconName = hostIcons?.[url.pathname]?.dark ?? hostIcons?.["/"]?.dark;
    if (!iconName) return undefined;

    const filePath = path.join(SEARCH_ICONS_DIRECTORY, `${iconName}.png`);
    return filePath;
  } catch {
    return undefined;
  }
}

function visitedAt(timestamp: number): string {
  // Search stores dates as seconds since Apple's 2001 reference date.
  const date = new Date((timestamp + 978_307_200) * 1000);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function openInSearch(url: string): Promise<void> {
  await closeMainWindow();
  await runAppleScript(
    `on run argv
  set targetURL to item 1 of argv
  tell application id "${SEARCH_BROWSER_BUNDLE_ID}" to activate
  tell application "System Events"
    tell process "Search"
      keystroke "t" using {command down}
      delay 0.15
      keystroke "l" using {command down}
      keystroke targetURL
      key code 36
    end tell
  end tell
end run`,
    [url],
  );
}

export default function History() {
  const {
    data: entries,
    isLoading,
    revalidate,
    error,
  } = usePromise(loadHistory);
  const { data: iconIndex } = usePromise(loadIconIndex);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search browsing history">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't Load Browsing History"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      ) : (
        (entries ?? []).map((entry) => {
          let hostname = entry.url;
          try {
            hostname = new URL(entry.url).hostname;
          } catch {
            // Invalid URLs are filtered out by loadHistory.
          }

          const title = entry.title.trim() || hostname;
          const subtitle = `${hostname} · ${visitedAt(entry.last)}`;
          const icon = faviconPath(entry, iconIndex ?? {});

          return (
            <List.Item
              key={entry.url}
              title={title}
              subtitle={subtitle}
              icon={icon ? { source: icon } : Icon.Globe}
              keywords={[entry.url, hostname, entry.title]}
              accessories={
                entry.count ? [{ text: `${entry.count} visits` }] : undefined
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Open in Search Browser"
                    icon={Icon.Globe}
                    onAction={() =>
                      openInSearch(entry.url).catch((openError: unknown) =>
                        showFailureToast(openError, {
                          title: "Couldn't Open Page in Search Browser",
                        }),
                      )
                    }
                  />
                  <Action.OpenInBrowser url={entry.url} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={entry.url}
                  />
                  <Action
                    title="Refresh History"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => revalidate()}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
