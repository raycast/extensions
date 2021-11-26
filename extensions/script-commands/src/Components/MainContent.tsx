import { 
  List, 
} from "@raycast/api"

import { 
  GroupSection 
} from "@components"

import { 
  Group 
} from "@models"

import { 
  useScriptCommands 
} from "@hooks"

export function MainContent(): JSX.Element {
  const { props } = useScriptCommands()  
  const sections = flattenGroups(props.groups)
  
  return (
    <List 
      navigationTitle={ props.title }
      isLoading={ props.isLoading } 
      searchBarPlaceholder={ props.placeholder }
      children={ sections }
    />
  )
}
  
type FlattenGroups = (groups: Group[]) => JSX.Element[]
  
const flattenGroups: FlattenGroups = (groups) => {
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

  return sections
}