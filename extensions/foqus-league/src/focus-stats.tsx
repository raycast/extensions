import { Action, ActionPanel, Detail, Icon, environment, launchCommand, LaunchType } from "@raycast/api";
import { HowItWorks } from "./lib/HowItWorks.tsx";
import { getPreferences, SUPPORT_URL } from "./lib/runtime.ts";
import { renderBoard } from "./lib/statsBoard.ts";
import { statusNotes } from "./lib/statusNotes.ts";
import { CHART_WIDTH, markdownImage } from "./lib/svg.ts";
import { themeFor, tiersFor } from "./lib/theme.ts";
import { useStats } from "./lib/useStats.ts";

export default function FocusStats() {
  const { data, isLoading } = useStats();

  const theme = themeFor(environment.appearance);
  const prefs = getPreferences();
  const stats = data?.stats;
  const width = CHART_WIDTH;

  let markdown = "";
  if (stats) {
    markdown = markdownImage(
      "Today, this week, streak, quests and the focus calendar",
      renderBoard(stats, theme, prefs.dailyGoal, tiersFor(prefs.leagues), width),
      width,
    );
    for (const note of statusNotes(data, isLoading)) markdown += `\n\n> ${note.title}. ${note.body}`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Show Recap"
              icon={Icon.Stars}
              onAction={() => launchCommand({ name: "focus-wrapped", type: LaunchType.UserInitiated })}
            />
            <Action
              title="Browse Sessions"
              icon={Icon.List}
              onAction={() => launchCommand({ name: "focus-sessions", type: LaunchType.UserInitiated })}
            />
            {stats && (
              <Action.Push
                title="How It Works"
                icon={Icon.QuestionMark}
                shortcut={{ modifiers: ["cmd"], key: "h" }}
                target={<HowItWorks stats={stats} prefs={prefs} />}
              />
            )}
            <Action.OpenInBrowser
              title="Buy Me a Coffee"
              icon={Icon.MugSteam}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              url={SUPPORT_URL}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
