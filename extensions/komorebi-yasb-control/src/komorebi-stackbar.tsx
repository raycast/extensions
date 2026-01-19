import { List, ActionPanel, Action, showHUD, popToRoot } from "@raycast/api";
import { run } from "./utils/run";

const modes = [
  { title: "Always", value: "always", message: "Stack bar mode: always" },
  { title: "Never", value: "never", message: "Stack bar mode: never" },
  { title: "On Stack", value: "on-stack", message: "Stack bar mode: on-stack" },
];

export default function Command() {
  return (
    <List navigationTitle="Stack Bar Mode">
      {modes.map((mode) => (
        <List.Item
          key={mode.value}
          title={mode.title}
          actions={
            <ActionPanel>
              <Action
                title="Set Mode"
                onAction={async () => {
                  run("komorebic", ["stackbar-mode", mode.value]);
                  await showHUD(mode.message);
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
