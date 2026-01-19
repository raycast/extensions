import { List, ActionPanel, Action, showHUD, popToRoot } from "@raycast/api";
import { run } from "./utils/run";

const stackActions = [
  { title: "Stack Left", command: ["stack", "left"], message: "Stacked left" },
  {
    title: "Stack Right",
    command: ["stack", "right"],
    message: "Stacked right",
  },
  { title: "Stack Up", command: ["stack", "up"], message: "Stacked up" },
  { title: "Stack Down", command: ["stack", "down"], message: "Stacked down" },
  { title: "Unstack", command: ["unstack"], message: "Window unstacked" },
];

export default function Command() {
  return (
    <List navigationTitle="Stack Operations">
      {stackActions.map((action, index) => (
        <List.Item
          key={index}
          title={action.title}
          actions={
            <ActionPanel>
              <Action
                title="Execute"
                onAction={async () => {
                  run("komorebic", action.command);
                  await showHUD(action.message);
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
