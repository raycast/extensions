import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { tools } from "./generated/tools";
import { launchAnvilURL } from "./launch-anvil";

export default function Command() {
  return (
    <List searchBarPlaceholder="Search Anvil tools...">
      {tools.map((tool) => (
        <List.Item
          key={tool.id}
          title={tool.name}
          subtitle={tool.description}
          accessories={[
            { text: tool.category },
            { icon: tool.isFree ? Icon.CheckCircle : Icon.Lock },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Anvil"
                icon={Icon.ArrowRight}
                onAction={() => launchAnvilURL(tool.url)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
