import {
  List,
  Icon,
  ActionPanel,
  Action,
  open,
  getPreferenceValues,
  Color,
} from "@raycast/api";
import { useState, useCallback } from "react";
import { getEvents, getVaultPath, toggleEventImportant } from "./utils/vault";
import {
  isAfter,
  parseISO,
  formatDistanceToNow,
  isBefore,
  isTomorrow,
  isToday,
} from "date-fns";
import { EventDetail } from "./components/EventDetail";
import path from "path";

interface Preferences {
  externalEditor?: { name: string; path: string };
  obsidianVaultName?: string;
  obsidianSubfolder?: string;
  showImportantFirst?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showImportantFirst, setShowImportantFirst] = useState(
    preferences.showImportantFirst === "important",
  );

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const allEvents = getEvents();
  const now = new Date();

  // Filter events that end in the future (or today)
  const upcoming = allEvents.filter((e) => {
    const end = parseISO(e.endDate);
    return isAfter(end, now) || end.toDateString() === now.toDateString();
  });

  // Sort by start date first
  upcoming.sort((a, b) => {
    return parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime();
  });

  // If "Important First" is enabled, sort important events to top
  if (showImportantFirst) {
    upcoming.sort((a, b) => {
      if (a.isImportant && !b.isImportant) return -1;
      if (!a.isImportant && b.isImportant) return 1;
      return 0;
    });
  }

  return (
    <List searchBarPlaceholder="Search upcoming events...">
      {upcoming.length === 0 ? (
        <List.EmptyView icon={Icon.Calendar} title="No upcoming events" />
      ) : (
        upcoming.map((e) => {
          const start = parseISO(e.startDate);
          const end = parseISO(e.endDate);

          let subtitle = "";
          if (isBefore(now, start)) {
            if (isToday(start)) {
              subtitle = "Starts Today";
            } else if (isTomorrow(start)) {
              subtitle = "Starts Tomorrow";
            } else {
              subtitle = `Starts ${formatDistanceToNow(start, { addSuffix: true })}`;
            }
          } else {
            if (isToday(end)) {
              subtitle = "Ends Today";
            } else if (isTomorrow(end)) {
              subtitle = "Ends Tomorrow";
            } else {
              subtitle = `Ends ${formatDistanceToNow(end, { addSuffix: true })}`;
            }
          }

          return (
            <List.Item
              key={`${e.id}-${refreshKey}`}
              icon={
                e.isImportant
                  ? { source: Icon.CircleFilled, tintColor: Color.Red }
                  : undefined
              }
              title={e.name}
              subtitle={subtitle}
              accessories={[{ text: `${e.startDate} → ${e.endDate}` }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Notes"
                    icon={Icon.Document}
                    target={<EventDetail event={e} />}
                  />
                  <Action
                    title={
                      e.isImportant
                        ? "Unmark as Important"
                        : "Mark as Important"
                    }
                    icon={Icon.Circle}
                    shortcut={{ modifiers: ["ctrl"], key: "i" }}
                    onAction={() => {
                      toggleEventImportant(e.id);
                      refresh();
                    }}
                  />
                  <Action
                    title={
                      showImportantFirst
                        ? "Sort Chronologically"
                        : "Sort Important First"
                    }
                    icon={Icon.List}
                    shortcut={{ modifiers: ["ctrl"], key: "s" }}
                    onAction={() => setShowImportantFirst((v) => !v)}
                  />
                  <Action
                    title="Open in Planwell"
                    icon={Icon.AppWindow}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={async () => {
                      const vaultPath = getVaultPath();
                      const filePath = path.join(
                        vaultPath,
                        "events",
                        `${e.id}.md`,
                      );
                      await open(filePath, "PlanWell.md");
                    }}
                  />
                  {preferences.externalEditor && (
                    <Action
                      title="Open in External Editor"
                      icon={Icon.TextDocument}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      onAction={async () => {
                        const vaultPath = getVaultPath();
                        const filePath = path.join(
                          vaultPath,
                          "events",
                          `${e.id}.md`,
                        );
                        const editorName =
                          preferences.externalEditor!.name.toLowerCase();

                        if (
                          editorName.includes("obsidian") &&
                          preferences.obsidianVaultName
                        ) {
                          // Use Obsidian protocol URL with vault name
                          const subfolder = preferences.obsidianSubfolder
                            ? `${preferences.obsidianSubfolder}/`
                            : "";
                          const relativePath = `${subfolder}events/${e.id}.md`;
                          const obsidianUrl = `obsidian://open?vault=${encodeURIComponent(preferences.obsidianVaultName)}&file=${encodeURIComponent(relativePath)}`;
                          await open(obsidianUrl);
                        } else {
                          await open(
                            filePath,
                            preferences.externalEditor!.path,
                          );
                        }
                      }}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
