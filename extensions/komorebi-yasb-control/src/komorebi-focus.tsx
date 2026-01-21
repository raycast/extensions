import { List, ActionPanel, Action, popToRoot } from "@raycast/api";
import { runWithFeedback } from "./utils/run";

const directions = [
  { title: "Focus Left", args: ["focus", "left"] },
  { title: "Focus Right", args: ["focus", "right"] },
  { title: "Focus Up", args: ["focus", "up"] },
  { title: "Focus Down", args: ["focus", "down"] },
  { title: "Cycle Focus Next", args: ["cycle-focus", "next"] },
  { title: "Cycle Focus Previous", args: ["cycle-focus", "previous"] },
];

export default function Command() {
  return (
    <List navigationTitle="Cycle Focus">
      {directions.map((dir) => (
        <List.Item
          key={dir.title}
          title={dir.title}
          actions={
            <ActionPanel>
              <Action
                title="Focus Window"
                onAction={async () => {
                  await runWithFeedback("komorebic", dir.args, `✓ ${dir.title}`);
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
