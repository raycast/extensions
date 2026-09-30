import { Action, ActionPanel, List, useNavigation } from "@raycast/api";

import allCommands from "./commands";
import { Command } from "./commands/types";

/**
 * This is the main entrypoint for the extension.
 * This will display a list of all the available commands.
 *
 * Upon selecting a command, the user will be taken to the command's component
 * where they can enter the required arguments and execute it to see the result.
 */
export default function CastCommandsList() {
  return (
    <List isLoading={allCommands === undefined}>
      {allCommands?.map((category) => (
        <List.Section key={category.title} title={category.title}>
          {Object.values(category.items).map((item) => (
            <ListItem item={item} key={item.name} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function ListItem({ item }: { item: Command }) {
  const { push } = useNavigation();

  return (
    <List.Item
      title={item.name}
      subtitle={item.description}
      actions={
        <ActionPanel>
          <Action title="See command details" onAction={() => push(<item.component />)} />
        </ActionPanel>
      }
    />
  );
}
