import { List, ActionPanel, Action, popToRoot } from "@raycast/api";
import { runWithFeedback } from "./utils/run";

const resizeActions = [
  { title: "Increase Width", value: "resize axis horizontal increase" },
  { title: "Decrease Width", value: "resize axis horizontal decrease" },
  { title: "Increase Height", value: "resize axis vertical increase" },
  { title: "Decrease Height", value: "resize axis vertical decrease" },
  { title: "Resize Left Edge", value: "resize edge left increase" },
  { title: "Resize Right Edge", value: "resize edge right increase" },
  { title: "Resize Top Edge", value: "resize edge top increase" },
  { title: "Resize Bottom Edge", value: "resize edge bottom increase" },
];

export default function Command() {
  return (
    <List navigationTitle="Resize Window">
      {resizeActions.map((action) => (
        <List.Item
          key={action.value}
          title={action.title}
          actions={
            <ActionPanel>
              <Action
                title="Resize"
                onAction={async () => {
                  const args = action.value.split(" ");
                  await runWithFeedback("komorebic", args, `✓ ${action.title}`);
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
