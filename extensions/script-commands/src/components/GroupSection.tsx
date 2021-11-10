import { 
  List
} from "@raycast/api"

import { 
  ScriptCommandItem 
} from "@components"

import { 
  Group, 
  ScriptCommand 
} from "@models"

type Props = { 
  group: Group,
  parentName?: string
}

export function GroupSection({ group, parentName }: Props) {
  const key = `${group.name}-${group.path}`

  group.scriptCommands.sort((left: ScriptCommand, right: ScriptCommand) => {
    return (left.title > right.title) ? 1 : -1
  })

  const title = parentName ?? group.name
  const subtitle = parentName != null ? group.name : ""

  return (
    <List.Section key={key} title={ title } subtitle={ subtitle }>
      {group.scriptCommands.map((scriptCommand) => (
        <ScriptCommandItem scriptCommand={scriptCommand} />
      ))}
    </List.Section>
  );
}