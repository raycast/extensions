import {
  List,
  Icon,
  ActionPanel,
  Action,
  open,
  getPreferenceValues,
} from "@raycast/api";
import { getEvents, getVaultPath } from "./utils/vault";
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
import { designTokens } from "./utils/design-tokens";

interface Preferences {
  externalEditor?: { name: string; path: string };
  obsidianVaultName?: string;
  obsidianSubfolder?: string;
}

export default function Command() {
  const { accent } = designTokens.colors;
  const preferences = getPreferenceValues<Preferences>();
  const allEvents = getEvents();
  const now = new Date();

  // Filter events that end in the future (or today)
  const upcoming = allEvents.filter((e) => {
    const end = parseISO(e.endDate);
    return isAfter(end, now) || end.toDateString() === now.toDateString();
  });

  // Sort by start date
  upcoming.sort((a, b) => {
    return parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime();
  });

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
              key={e.id}
              icon={{ source: Icon.Star, tintColor: accent.primary }}
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
