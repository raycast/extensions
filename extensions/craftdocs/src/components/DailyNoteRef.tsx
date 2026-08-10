import { Action, ActionPanel, List } from "@raycast/api";
import { buildDailyNoteDateQuery, buildDailyNoteOpenUrl } from "../lib/dailyNotes";

export const DailyNoteRef = ({ date, text, spaceID }: { date: Date | undefined; text: string; spaceID: string }) => (
  <List.Item
    title={date ? date.toDateString() : "Specify query"}
    subtitle={text}
    actions={
      !date ? undefined : (
        <ActionPanel>
          <Action.Open
            title={`Open ${date.toDateString()}`}
            target={buildDailyNoteOpenUrl(buildDailyNoteDateQuery(date), spaceID)}
          />
        </ActionPanel>
      )
    }
  />
);
