import { Action, ActionPanel, Icon, List, showHUD, showToast, Toast, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { PRESETS, disable, durationLabel, enable, getStatus, refreshMenuBar } from "./lib/session";
import { parseDuration } from "./lib/parse";
import { presetSubtitle, startAccessoryTitle, turnOnMessage } from "./lib/labels";
import { rememberDuration } from "./lib/recent";

export default function Command() {
  const { data: status, isLoading, revalidate } = usePromise(getStatus);
  const [searchText, setSearchText] = useState("");

  async function start(minutes: number | null, options: { remember?: boolean } = {}) {
    try {
      await enable(minutes);
      if (options.remember && minutes !== null) {
        await rememberDuration(minutes);
        await refreshMenuBar();
      }
      await showHUD(turnOnMessage(minutes));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not turn on Lid Awake",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    revalidate();
  }

  async function turnOff() {
    try {
      await disable();
      await showHUD("Lid Awake off");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not turn off Lid Awake",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    revalidate();
  }

  const on = status?.on ?? false;
  const now = Date.now();
  const accessoryTitle = startAccessoryTitle(status, now);
  const typed = searchText.trim();
  const customMinutes = parseDuration(typed);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Pick a duration, or type one like 45m, 1h30 or 2.5h"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {customMinutes !== null && (
        <List.Item
          title={`Keep Awake for ${durationLabel(customMinutes)}`}
          subtitle={presetSubtitle(customMinutes, now)}
          icon={{ source: Icon.Pencil, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Keep Awake" icon={Icon.Bolt} onAction={() => start(customMinutes, { remember: true })} />
            </ActionPanel>
          }
        />
      )}
      {typed !== "" && customMinutes === null && (
        <List.Item
          title={`Can't read "${typed}" as a duration`}
          subtitle="Try 45m, 1h30, 2.5h or 1:30, up to 7 days"
          icon={{ source: Icon.QuestionMark, tintColor: Color.SecondaryText }}
        />
      )}
      {on && (
        <List.Item
          title="Turn Off"
          icon={{ source: Icon.Power, tintColor: Color.Red }}
          accessories={[{ text: accessoryTitle }]}
          actions={
            <ActionPanel>
              <Action title="Turn off Lid Awake" icon={Icon.Power} onAction={turnOff} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      )}
      {PRESETS.map((minutes) => (
        <List.Item
          key={String(minutes)}
          title={durationLabel(minutes)}
          subtitle={presetSubtitle(minutes, now)}
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action title="Keep Awake" icon={Icon.Bolt} onAction={() => start(minutes)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
