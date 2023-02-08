import Config from "../Config";
import { Action, ActionPanel, List, openExtensionPreferences } from "@raycast/api";
import { DailyNoteRef } from "./DailyNoteRef";
import { Shortcut } from "./Shortcut";

type DailyNotesParams = {
  appExists: boolean;
  config: Config | null;
  query: string;
  date: Date | undefined;
};

export const DailyNotes = ({ appExists, config, query, date }: DailyNotesParams) => {
  if (!appExists || !config) {
    return (
      <List.EmptyView
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
        title="No results"
        description="Selecting Craft application in preferences might help"
        icon={"command-icon-small.png"}
      />
    );
  }

  const space = config.primarySpace();

  if (!space) {
    return (
      <List.EmptyView
        title="Craft not initialized"
        description="Try using Craft app first"
        icon={"command-icon-small.png"}
      />
    );
  }

  if (query.length > 0) {
    return <DailyNoteRef date={date} text={query} spaceID={space.spaceID} />;
  }

  return (
    <List.Section title="Shortcuts">
      <Shortcut dayRef="today" spaceID={space.spaceID} />
      <Shortcut dayRef="yesterday" spaceID={space.spaceID} />
      <Shortcut dayRef="tomorrow" spaceID={space.spaceID} />
    </List.Section>
  );
};
