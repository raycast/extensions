import { Action, ActionPanel, List } from "@raycast/api";
import * as chrono from "chrono-node";
import { buildDailyNoteOpenUrl } from "../lib/dailyNotes";

type DayReference = "today" | "yesterday" | "tomorrow";

export const Shortcut = ({ dayRef, spaceID }: { dayRef: DayReference; spaceID: string }) => (
  <List.Item
    title={toTitleCase(dayRef)}
    subtitle={chrono.parseDate(dayRef)?.toDateString() ?? toTitleCase(dayRef)}
    actions={
      <ActionPanel>
        <Action.Open
          title={`Open ${toPossessiveTitleCase(dayRef)} Note`}
          target={buildDailyNoteOpenUrl(dayRef, spaceID)}
        />
      </ActionPanel>
    }
  />
);

const toTitleCase = (str: string) => str.substring(0, 1).toUpperCase() + str.substring(1);
const toPossessiveTitleCase = (str: string) => `${toTitleCase(str)}'s`;
