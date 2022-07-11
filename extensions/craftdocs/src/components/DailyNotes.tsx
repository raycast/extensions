import Config from "../Config";
import { List } from "@raycast/api";
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
    return <List.EmptyView title="Craft not installed" icon={"command-icon-small.png"} />;
  }

  if (query.length > 0) {
    return <DailyNoteRef date={date} text={query} spaceID={config?.primarySpace()?.spaceID || ""} />;
  }

  return (
    <List.Section title="Shortcuts">
      <Shortcut dayRef="today" spaceID={config?.primarySpace()?.spaceID || ""} />
      <Shortcut dayRef="yesterday" spaceID={config?.primarySpace()?.spaceID || ""} />
      <Shortcut dayRef="tomorrow" spaceID={config?.primarySpace()?.spaceID || ""} />
    </List.Section>
  );
};
