import { List, ActionPanel, Action, popToRoot } from "@raycast/api";
import { runWithFeedback } from "./utils/run";

const directions = [
  { title: "Move Left", value: "left" },
  { title: "Move Right", value: "right" },
  { title: "Move Up", value: "up" },
  { title: "Move Down", value: "down" },
];

export default function Command() {
  return (
    <List navigationTitle="Move Window">
      {directions.map((dir) => (
        <List.Item
          key={dir.value}
          title={dir.title}
          actions={
            <ActionPanel>
              <Action
                title="Move Window"
                onAction={async () => {
                  await runWithFeedback("komorebic", ["move", dir.value], `✓ Moved ${dir.value}`);
                  await popToRoot();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
