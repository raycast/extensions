import { 
  List, 
} from "@raycast/api"

import { 
  GroupSection 
} from "@components"

import { 
  useScriptCommands 
} from "@hooks"

export function MainContent(): JSX.Element {
  const { props } = useScriptCommands()  

  return (
    <List 
      navigationTitle={ props.title }
      isLoading={ props.isLoading } 
      searchBarPlaceholder={ props.placeholder }
      children={
        props.groups.map(group => (
          <GroupSection 
            key={group.identifier}
            group={ group }
          />
        ))
      }
    />
  )
}
