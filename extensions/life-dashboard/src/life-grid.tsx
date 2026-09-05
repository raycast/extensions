import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List, openExtensionPreferences } from "@raycast/api";
import { computeLifeStats, fmt, lifeGridSvgUri, parseLifeInput, RawPrefs } from "./life-stats";

export default function LifeGrid() {
  const prefs = getPreferenceValues<RawPrefs>();
  const input = parseLifeInput(prefs);
  if (!input) {
    return (
      <List>
        <List.EmptyView
          icon="⌛"
          title="Set Your Birthday First"
          description="Add your birthday in the extension preferences to draw your life grid."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  const s = computeLifeStats(input);
  const md = [
    `# Your Life in Weeks`,
    `**${s.lifePct.toFixed(2)}% lived** · ${fmt(s.weeksLived)} of ${fmt(s.totalWeeks)} weeks · one row per year, one square per week`,
    `![Your life in weeks](${lifeGridSvgUri(input)})`,
  ].join("\n\n");
  return (
    <Detail
      navigationTitle="Life Grid"
      markdown={md}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
