import { CraftConfig } from "../Config";
import { Action, ActionPanel, List, openExtensionPreferences } from "@raycast/api";
import { DailyNoteRef } from "./DailyNoteRef";
import { Shortcut } from "./Shortcut";

type DailyNotesParams = {
  config: CraftConfig | null;
  query: string;
  date: Date | undefined;
  selectedSpaceId?: string;
};

export const DailyNotes = ({ config, query, date, selectedSpaceId }: DailyNotesParams) => {
  if (!config) {
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

  // Use selectedSpaceId if provided, otherwise fallback to primary space
  const targetSpaceId = selectedSpaceId || config.primarySpace?.spaceID;
  const targetSpace = config.spaces.find((space) => space.spaceID === targetSpaceId);

  if (!targetSpaceId || !targetSpace) {
    return (
      <List.EmptyView
        title="No Space selected"
        description="Please select a Space or make sure Craft is initialized"
        icon={"command-icon-small.png"}
      />
    );
  }

  if (query.length > 0) {
    return <DailyNoteRef date={date} text={query} spaceID={targetSpaceId} />;
  }

  return (
    <List.Section title="Shortcuts">
      <Shortcut dayRef="today" spaceID={targetSpaceId} />
      <Shortcut dayRef="yesterday" spaceID={targetSpaceId} />
      <Shortcut dayRef="tomorrow" spaceID={targetSpaceId} />
    </List.Section>
  );
};
