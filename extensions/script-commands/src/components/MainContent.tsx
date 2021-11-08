import { List } from "@raycast/api"

import { GroupSection, SubGroupSection } from "@components"

import { Group } from "@models";

type Props = {
  isLoading: boolean
  groups: Group[]
  totalScriptCommands: number
}

export function MainContent({ isLoading, groups, totalScriptCommands }: Props): JSX.Element {
  const sections: JSX.Element[] = []

  groups.sort((left: Group, right: Group) => {
    return (left.name > right.name) ? 1 : -1
  })
  
  for (const group of groups) {
    sections.push(<GroupSection group={group} />)

    if (group.subGroups != null && group.subGroups?.length > 0) {
      group.subGroups.sort((left: Group, right: Group) => {
        return (left.name > right.name) ? 1 : -1
      })

      for (const subGroup of group.subGroups) {
        sections.push(<SubGroupSection parentName={group.name} subGroup={subGroup} />)
      }
    }
  }
  
  return (
  <List 
    isLoading={isLoading} 
    searchBarPlaceholder={`Search for your Script Command among of ${totalScriptCommands}`}
  >
    {sections}
  </List>
  )
}