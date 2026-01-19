import { List, ActionPanel, Action, showHUD, popToRoot } from "@raycast/api";
import { run } from "./utils/run";

const directions = [
  { title: "Focus Left", value: "left" },
  { title: "Focus Right", value: "right" },
  { title: "Focus Up", value: "up" },
  { title: "Focus Down", value: "down" },
  { title: "Cycle Focus Next", value: "cycle-focus next" },
  { title: "Cycle Focus Previous", value: "cycle-focus previous" },
];

export default function Command() {
  return (
    <List navigationTitle="Cycle Focus">
      {directions.map((dir) => (
        <List.Item
          key={dir.value}
          title={dir.title}
          actions={
            <ActionPanel>
              <Action
                title="Focus Window"
                onAction={async () => {
                  const args = dir.value.split(" ");
                  run("komorebic", args);
                  await showHUD(`✓ ${dir.title}`);
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
