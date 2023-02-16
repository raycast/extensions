import { Action, ActionPanel, List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { TimestampType, generateTimestamp, prettyPreview } from "./timestamps";

export default function Command() {
  const [date, setDate] = useState<Date>(new Date());
  const { defaultAction } = getPreferenceValues();

  function Actions(props: { type: TimestampType }) {
    const { type } = props;

    return (
      <ActionPanel>
        {defaultAction === "paste" ? (
          <>
            <Action.Paste content={`${generateTimestamp(date, type)}`} />
            <Action.CopyToClipboard content={`${generateTimestamp(date, type)}`} />
          </>
        ) : (
          <>
            <Action.CopyToClipboard content={`${generateTimestamp(date, type)}`} />
            <Action.Paste content={`${generateTimestamp(date, type)}`} />
          </>
        )}
      </ActionPanel>
    );
  }

  return (
    <List navigationTitle="Generate Discord Timestamp">
      <List.Section title="Set Date">
        <List.Item
          title={"Change Date"}
          actions={
            <ActionPanel>
              <Action.PickDate
                title="Set Date"
                onChange={(date) => {
                  if (date) setDate(date);
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Timestamps">
        <List.Item title={"Short Time"} subtitle={`${prettyPreview(date, "t")}`} actions={<Actions type={"t"} />} />
        <List.Item title={"Long Time"} subtitle={`${prettyPreview(date, "T")}`} actions={<Actions type={"T"} />} />
        <List.Item title={"Short Date"} subtitle={`${prettyPreview(date, "d")}`} actions={<Actions type={"d"} />} />
        <List.Item title={"Long Date"} subtitle={`${prettyPreview(date, "D")}`} actions={<Actions type={"D"} />} />
        <List.Item
          title={"Short Date/Time"}
          subtitle={`${prettyPreview(date, "f")}`}
          actions={<Actions type={"f"} />}
        />
        <List.Item title={"Long Date/Time"} subtitle={`${prettyPreview(date, "F")}`} actions={<Actions type={"F"} />} />
        <List.Item title={"Relative Time"} subtitle={`${prettyPreview(date, "R")}`} actions={<Actions type={"R"} />} />
        <List.Item title={"Epoch Time"} subtitle={`${prettyPreview(date, "E")}`} actions={<Actions type={"E"} />} />
      </List.Section>
    </List>
  );
}
