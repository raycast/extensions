import { List, ActionPanel, Action, popToRoot } from "@raycast/api";
import { runWithFeedback } from "./utils/run";

const resizeActions = [
  { title: "Increase Width", args: ["resize", "axis", "horizontal", "increase"] },
  { title: "Decrease Width", args: ["resize", "axis", "horizontal", "decrease"] },
  { title: "Increase Height", args: ["resize", "axis", "vertical", "increase"] },
  { title: "Decrease Height", args: ["resize", "axis", "vertical", "decrease"] },
  { title: "Resize Left Edge", args: ["resize", "edge", "left", "increase"] },
  { title: "Resize Right Edge", args: ["resize", "edge", "right", "increase"] },
  { title: "Resize Top Edge", args: ["resize", "edge", "top", "increase"] },
  { title: "Resize Bottom Edge", args: ["resize", "edge", "bottom", "increase"] },
];

export default function Command() {
  return (
    <List navigationTitle="Resize Window">
      {resizeActions.map((action) => (
        <List.Item
          key={action.title}
          title={action.title}
          actions={
            <ActionPanel>
              <Action
                title="Resize"
                onAction={async () => {
                  await runWithFeedback("komorebic", action.args, `✓ ${action.title}`);
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
