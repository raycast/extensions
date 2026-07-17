import { Action, ActionPanel, List } from "@raycast/api";
import { ClassName } from "./domain";
import { classIcon } from "./utils";
import { DeckList } from "./DeckList";

export default function Command() {
  const classes = Object.values(ClassName);
  return (
    <List>
      {classes.map((className) => (
        <List.Item
          key={className}
          icon={classIcon(className)}
          title={className}
          actions={<Actions className={className} />}
        />
      ))}
    </List>
  );
}

function Actions({ className }: { className: ClassName }) {
  return (
    <ActionPanel title={className}>
      <ActionPanel.Section>
        <Action.Push title="Fetch Decks" target={<DeckList className={className} />} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
