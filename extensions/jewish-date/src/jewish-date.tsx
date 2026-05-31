import { Action, ActionPanel, List } from "@raycast/api";

import { getHebrewDate, getHebrewDateAfterShkia } from "./format-hebrew-date";

export default function Command() {
  const dates = [
    {
      title: "Before Shkia-Sunset",
      subtitle: getHebrewDate(),
    },
    {
      title: "After Shkia-Sunset",
      subtitle: getHebrewDateAfterShkia(),
    },
  ];

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
