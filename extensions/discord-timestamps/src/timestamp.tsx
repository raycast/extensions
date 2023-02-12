import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { generateTimestamp, prettyPreview } from "./timestamps";

export default function Command() {
  const [date, setDate] = useState<Date>(new Date());

  return (
    <List navigationTitle="Generate Discord Timestamp">
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
      <List.Item
        title={"Copy Short Time"}
        subtitle={`${prettyPreview(date, "t")}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy to Clipboard" content={`${generateTimestamp(date, "t")}`} />
          </ActionPanel>
        }
      />
      <List.Item
        title={"Copy Long Time"}
        subtitle={`${prettyPreview(date, "T")}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy to Clipboard" content={`${generateTimestamp(date, "t")}`} />
          </ActionPanel>
        }
      />
      <List.Item
        title={"Copy Short Date"}
        subtitle={`${prettyPreview(date, "d")}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy to Clipboard" content={`${generateTimestamp(date, "t")}`} />
          </ActionPanel>
        }
      />
      <List.Item
        title={"Copy Long Date"}
        subtitle={`${prettyPreview(date, "D")}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy to Clipboard" content={`${generateTimestamp(date, "t")}`} />
          </ActionPanel>
        }
      />
      <List.Item
        title={"Copy Short Date/Time"}
        subtitle={`${prettyPreview(date, "f")}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy to Clipboard" content={`${generateTimestamp(date, "t")}`} />
          </ActionPanel>
        }
      />
      <List.Item
        title={"Copy Long Date/Time"}
        subtitle={`${prettyPreview(date, "F")}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy to Clipboard" content={`${generateTimestamp(date, "t")}`} />
          </ActionPanel>
        }
      />
      <List.Item
        title={"Copy Relative Time"}
        subtitle={`${prettyPreview(date, "R")}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy to Clipboard" content={`${generateTimestamp(date, "t")}`} />
          </ActionPanel>
        }
      />
      <List.Item
        title={"Copy Epoch Time"}
        subtitle={`${prettyPreview(date, "E")}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy to Clipboard" content={`${generateTimestamp(date, "t")}`} />
          </ActionPanel>
        }
      />
    </List>
  );
}
