import { List, ActionPanel, Action, popToRoot } from "@raycast/api";
import { runWithFeedback } from "./utils/run";

const stackActions = [
  { title: "Stack Left", command: ["stack", "left"], message: "✓ Stacked left" },
  {
    title: "Stack Right",
    command: ["stack", "right"],
    message: "✓ Stacked right",
  },
  { title: "Stack Up", command: ["stack", "up"], message: "✓ Stacked up" },
  { title: "Stack Down", command: ["stack", "down"], message: "✓ Stacked down" },
  { title: "Unstack", command: ["unstack"], message: "✓ Window unstacked" },
];

export default function Command() {
  return (
    <List navigationTitle="Stack Operations">
      {stackActions.map((action) => (
        <List.Item
          key={action.title}
          title={action.title}
          actions={
            <ActionPanel>
              <Action
                title="Execute"
                onAction={async () => {
                  await runWithFeedback("komorebic", action.command, action.message);
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
