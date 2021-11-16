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
  placeholder: string
  isLoading: boolean
  groups: Group[]
  showSearchListAction: boolean,
  onAction?: () => void
}

export function MainContent({ navigationTitle, placeholder, isLoading, groups, showSearchListAction, onAction }: Props): JSX.Element {
  const sections: JSX.Element[] = []

  groups.sort((left: Group, right: Group) => {
    return (left.name > right.name) ? 1 : -1
  })

  for (const group of groups) {
    sections.push(
      <GroupSection
        key={ group.path } 
        group={ group } 
        onAction={ 
          () => {
            if (onAction != undefined)
              onAction()
          } 
        }
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
            onAction={ 
              () => {
                if (onAction != undefined)
                  onAction()
              } 
            }
          />
        )
      })
    }
  }
  
  return (
    <List 
      navigationTitle={ navigationTitle }
      isLoading={ isLoading } 
      searchBarPlaceholder={ placeholder }
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