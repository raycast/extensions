import { Action, ActionPanel, List } from "@raycast/api";

import { getHebrewDate, getHebrewDateAfterShkia } from "./format-hebrew-date";

export default function Command() {
  let dates: { title: string; subtitle: string }[];

  try {
    dates = [
      {
        title: "Before Shkia-Sunset",
        subtitle: getHebrewDate(),
      },
      {
        title: "After Shkia-Sunset",
        subtitle: getHebrewDateAfterShkia(),
      },
    ];
  } catch (error) {
    return (
      <List>
        <List.EmptyView
          title="Unable to Format Jewish Date"
          description={error instanceof Error ? error.message : "Please try again later."}
        />
      </List>
    );
  }

  return (
    <List>
      {dates.map((date) => (
        <List.Item
          key={date.title}
          title={date.title}
          subtitle={date.subtitle}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Jewish Date" content={date.subtitle} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
