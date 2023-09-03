import Config from "../Config";
import { Action, ActionPanel, List, openExtensionPreferences } from "@raycast/api";
import { DailyNoteRef } from "./DailyNoteRef";
import { DayReference, Shortcut } from "./Shortcut";

type DailyNotesParams = {
  appExists: boolean;
  config: Config | undefined;
  query: string;
  date: Date | undefined;
  spaceID: string | undefined;
};

export const DailyNotes = ({ appExists, config, query, date, spaceID }: DailyNotesParams) => {
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

  const selectedSpaceID = spaceID || space.spaceID;

  if (query.length > 0) {
    return <DailyNoteRef date={date} text={query} spaceID={selectedSpaceID} />;
  }

  return (
    <List.Section title="Shortcuts">
      {(["today", "yesterday", "tomorrow"] as DayReference[]).map((dayRef, index) => (
        <Shortcut key={index} dayRef={dayRef} spaceID={selectedSpaceID} config={config} />
      ))}
    </List.Section>
  );
};
