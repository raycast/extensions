import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { useCachedState } from "@raycast/utils";

function getSteamStoreUrl(appId: number, useClient: boolean) {
  if (useClient) {
    return `steam://store/${appId}`;
  }
  return `https://store.steampowered.com/app/${appId}`;
}

interface SkippedEntry {
  ts: number;
  name: string;
  tags?: string[];
}

type TimeFilter = "all" | "year" | "3months" | "1month" | "1week";

const TIME_FILTERS: { value: TimeFilter; title: string }[] = [
  { value: "all", title: "All Time" },
  { value: "1week", title: "Past Week" },
  { value: "1month", title: "Past Month" },
  { value: "3months", title: "Past 3 Months" },
  { value: "year", title: "Past Year" },
];

function getRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 365) return `${Math.floor(days / 365)}y ago`;
  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

function truncateName(name: string, limit: number = 25): string {
  if (!name) return "";
  return name.length > limit ? name.substring(0, limit) + "..." : name;
}

export default function Command() {
  const [skippedGames, setSkippedGames] = useCachedState<
    Record<number, SkippedEntry>
  >("skippedGames", {});

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const prefs = getPreferenceValues<Preferences>();

  const filteredEntries = useMemo(() => {
    const now = Date.now();
    const thresholds: Record<TimeFilter, number> = {
      all: 0,
      year: 365 * 24 * 60 * 60 * 1000,
      "3months": 90 * 24 * 60 * 60 * 1000,
      "1month": 30 * 24 * 60 * 60 * 1000,
      "1week": 7 * 24 * 60 * 60 * 1000,
    };
    const limit = thresholds[timeFilter];
    return Object.entries(skippedGames)
      .filter(([, entry]) => {
        if (limit === 0) return true;
        return now - entry.ts <= limit;
      })
      .sort(([, a], [, b]) => b.ts - a.ts);
  }, [skippedGames, timeFilter]);

  const handleUnskip = (appId: number) => {
    const newState = { ...skippedGames };
    delete newState[appId];
    setSkippedGames(newState);
    showToast({
      title: "Removed from skipped list",
      style: Toast.Style.Success,
    });
  };

  const handleUnskipAll = () => {
    setSkippedGames({});
    showToast({
      title: "All skipped games removed",
      style: Toast.Style.Success,
    });
  };

  return (
    <List
      searchBarPlaceholder="Search skipped games..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Time Filter"
          value={timeFilter}
          onChange={(val) => setTimeFilter(val as TimeFilter)}
        >
          {TIME_FILTERS.map((f) => (
            <List.Dropdown.Item key={f.value} title={f.title} value={f.value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Checkmark}
        title="No Skipped Games"
        description="You haven't skipped any games yet."
      />
      {filteredEntries.map(([appId, entry]: [string, SkippedEntry]) => (
        <List.Item
          key={appId}
          icon={{
            source: `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/library_600x900.jpg`,
            fallback: `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`,
          }}
          title={truncateName(entry.name || `App ${appId}`)}
          subtitle={
            entry.tags
              ?.slice(0, 3)
              .map((tag: string) =>
                tag
                  .split(" ")
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" "),
              )
              .join(", ") || "—"
          }
          accessories={[{ text: getRelativeTime(entry.ts) }]}
          actions={
            <ActionPanel>
              <Action
                title="Unskip"
                icon={Icon.Undo}
                onAction={() => handleUnskip(Number(appId))}
              />
              <Action.Open
                title="Open Steam Page"
                target={getSteamStoreUrl(Number(appId), prefs.useSteamClient)}
                icon={Icon.Window}
              />
              <Action
                title="Unskip All"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{
                  Windows: { modifiers: ["ctrl", "shift"], key: "x" },
                  macOS: { modifiers: ["cmd", "shift"], key: "x" },
                }}
                onAction={handleUnskipAll}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
