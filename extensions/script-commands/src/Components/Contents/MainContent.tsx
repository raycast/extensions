import { 
  List, 
} from "@raycast/api"

import { 
  GroupSection 
} from "@components"

import { 
  useScriptCommands 
} from "@hooks"

import { useContext } from "react"

import { ApplicationContext } from "@providers"

export function MainContent(): JSX.Element {
  const { state } = useContext(ApplicationContext)
  const { props } = useScriptCommands()  
  
  console.log(`[MainContent] Filter:`, state.filter)

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
