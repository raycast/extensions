import { Action, ActionPanel, List } from "@raycast/api";
import * as chrono from "chrono-node";
import { ListSpaces } from "./ListSpaces";
import Config from "../Config";

export type DayReference = "today" | "yesterday" | "tomorrow";

type ShortcutProps = {
  dayRef: DayReference;
  spaceID: string;
  config: Config;
};

export const Shortcut = ({ config, dayRef, spaceID }: ShortcutProps) => (
  <List.Item
    title={toTitleCase(dayRef)}
    subtitle={chrono.parseDate(dayRef).toDateString()}
    actions={
      <ActionPanel>
        <Action.Open
          title={`Open ${dayRef.charAt(0).toUpperCase() + dayRef.slice(1)} Notes`}
          target={`craftdocs://openByQuery?query=${dayRef}&spaceId=${spaceID}`}
        />
        <Action.Push title="Name spaces" target={<ListSpaces config={config} />} />
      </ActionPanel>
    }
  />
);

const toTitleCase = (str: string) => str.substring(0, 1).toUpperCase() + str.substring(1);
