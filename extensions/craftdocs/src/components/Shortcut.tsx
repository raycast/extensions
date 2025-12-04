import { Action, ActionPanel, List } from "@raycast/api";
import * as chrono from "chrono-node";

type DayReference = "today" | "yesterday" | "tomorrow";

export const Shortcut = ({ dayRef, spaceID }: { dayRef: DayReference; spaceID: string }) => (
  <List.Item
    title={toTitleCase(dayRef)}
    subtitle={chrono.parseDate(dayRef).toDateString()}
    actions={
      <ActionPanel>
        <Action.Open
          title={`Open ${dayRef.charAt(0).toUpperCase() + dayRef.slice(1)} Notes`}
          target={`craftdocs://openByQuery?query=${dayRef}&spaceId=${spaceID}`}
        />
      </ActionPanel>
    }
  />
);

const toTitleCase = (str: string) => str.substring(0, 1).toUpperCase() + str.substring(1);
