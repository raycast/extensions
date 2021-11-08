import { List } from "@raycast/api"

import { ScriptCommandItem } from "@components"

import { Group, ScriptCommand } from "@models"

type Props = { 
  parentName: string
  subGroup: Group 
}

export function SubGroupSection({ parentName, subGroup }: Props) {
  const key = `${subGroup.name}-${subGroup.path}`

  subGroup.scriptCommands.sort((left: ScriptCommand, right: ScriptCommand) => {
    return (left.title > right.title) ? 1 : -1
  })

  return (
    <List.Section key={key} title={parentName} subtitle={subGroup.name}>
      {subGroup.scriptCommands.map((scriptCommand) => (
        <ScriptCommandItem scriptCommand={scriptCommand} />
      ))}
    </List.Section>
  )
}
