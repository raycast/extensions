import { 
  List, 
} from "@raycast/api"

import { 
  GroupSection 
} from "@components"

import { 
  Group 
} from "@models"

type Props = {
  navigationTitle: string
  placeholder: string
  isLoading: boolean
  groups: Group[]
}

export function MainContent({ navigationTitle, placeholder, isLoading, groups }: Props): JSX.Element {
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
      searchBarPlaceholder={ placeholder }
    >
      { sections }
    </List>
  )
}