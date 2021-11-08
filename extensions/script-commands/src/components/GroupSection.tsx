import { List } from "@raycast/api";

import { ScriptCommandItem } from "@components";

import { Group, ScriptCommand } from "@models";

type Props = { 
  group: Group 
}

export function GroupSection({ group }: Props) {
  const key = `${group.name}-${group.path}`;

  group.scriptCommands.sort((left: ScriptCommand, right: ScriptCommand) => {
    return (left.title > right.title) ? 1 : -1;
  })

  return (
    <List.Section key={key} title={group.name}>
      {group.scriptCommands.map((scriptCommand) => (
        <ScriptCommandItem scriptCommand={scriptCommand} />
      ))}
    </List.Section>
  );
}
