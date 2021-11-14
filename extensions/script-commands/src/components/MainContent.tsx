import { 
  ActionPanel,
  Icon,
  List, 
  PushAction
} from "@raycast/api"

import { 
  GroupSection 
} from "@components"

import { 
  Group 
} from "@models"

import { 
  ScriptCommandsList 
} from "@commands"

type Props = {
  navigationTitle: string
  isLoading: boolean
  groups: Group[]
  totalScriptCommands: number
  showSearchListAction: boolean
}

export function MainContent({ navigationTitle, isLoading, groups, totalScriptCommands, showSearchListAction }: Props): JSX.Element {
  const sections: JSX.Element[] = []

  groups.sort((left: Group, right: Group) => {
    return (left.name > right.name) ? 1 : -1
  })

  for (const group of groups) {
    sections.push(
      <GroupSection
        key={ group.path } 
        group={ group } 
      />
    )

    if (group.subGroups != null && group.subGroups?.length > 0) {
      group.subGroups.sort((left: Group, right: Group) => {
        return (left.name > right.name) ? 1 : -1
      })

      group.subGroups.forEach(subGroup => {
        const keySubGroup = `${group.path}-${subGroup.path}`
        sections.push(
          <GroupSection 
            key={ keySubGroup } 
            parentName={ group.name } 
            group={ subGroup } 
          />
        )
      })
    }
  }
  
  return (
    <List 
      navigationTitle={ navigationTitle }
      isLoading={ isLoading } 
      searchBarPlaceholder={`Search for your Script Command among of ${totalScriptCommands} items`}
      actions={
        showSearchListAction && 
        <ActionPanel>
          <PushAction 
            title="Open Search Commands List"
            icon={ Icon.MagnifyingGlass }
            target={ <ScriptCommandsList /> } 
          />
        </ActionPanel>
      }
    >
      { sections }
    </List>
  )
}