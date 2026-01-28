import { Update } from "./scrape";
import { ActionPanel, Action, Icon, List } from "@raycast/api";

function UpdateListItem({ update }: { update: Update }) {
  return (
    <List.Item
      icon={update.icon}
      title={update.name}
      subtitle={update.description}
      accessories={[
        { text: update.version },
        { icon: update.major ? { source: Icon.Star } : undefined, tooltip: "MAJOR" },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={update.link} />
        </ActionPanel>
      }
    />
  );
}

export { UpdateListItem };
