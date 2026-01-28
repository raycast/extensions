import { Action, ActionPanel, List } from "@raycast/api";

export const DailyNoteRef = ({ date, text, spaceID }: { date: Date | undefined; text: string; spaceID: string }) => (
  <List.Item
    title={date ? date.toDateString() : "Specify query"}
    subtitle={text}
    actions={
      !date ? undefined : (
        <ActionPanel>
          <Action.Open
            title={`Open ${date.toDateString()}`}
            target={`craftdocs://openByQuery?query=${date.toISOString().substring(0, 10)}&spaceId=${spaceID}`}
          />
        </ActionPanel>
      )
    }
  />
);
