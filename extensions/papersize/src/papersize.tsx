import { ActionPanel, Action, Icon, List } from "@raycast/api";
import paperSizesData from "./paper_sizes.json"; // Assuming paper_sizes.json is in the same directory

export default function Command() {
  return (
    <List searchBarPlaceholder="Search paper sizes...">
      {paperSizesData.map((paper) => (
        <List.Item
          key={paper.id}
          icon={Icon.Document}
          title={paper.title}
          subtitle={`Category: ${paper.category}`}
          accessories={[{ text: `Metric: ${paper.metric}` }, { text: `Imperial: ${paper.imperial}` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Metric Size"
                content={paper.metric}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
              />
              <Action.CopyToClipboard
                title="Copy Imperial Size"
                content={paper.imperial}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
