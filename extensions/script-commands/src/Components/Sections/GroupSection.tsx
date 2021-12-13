import { 
  List
} from "@raycast/api"

import { 
  ScriptCommandItem 
} from "@components"

import { 
  CompactGroup,
} from "@models"

type Props = { 
  group: CompactGroup
}

export function GroupSection({ group }: Props): JSX.Element  {
  return (
    <List.Section 
      key={ group.identifier } 
      title={ group.title } 
      subtitle={ group.subtitle }
      children={
        group.scriptCommands.map(scriptCommand => (
          <ScriptCommandItem 
            key={ scriptCommand.identifier } 
            scriptCommand={ scriptCommand }
            group={ group }
          />
        ))
      }
    />
  )
}