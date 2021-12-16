import { 
  ActionPanel,
  confirmAlert,
  List, 
} from "@raycast/api"

import { 
  ClearFilterActionItem,
  GroupSection,
  PackageToast,
} from "@components"

import { 
  useScriptCommands,
} from "@hooks"

import { 
  Progress 
} from "@types"

import { 
  CompactGroup 
} from "@models"

export function MainContent(): JSX.Element {
  const { props, setFilter, setSelection, installPackage } = useScriptCommands()  

  const handlePackageInstall = async (group: CompactGroup) => {
    const result = await installPackage(group, process => {
      PackageToast(Progress.InProgress, group.title, `Script Command: ${process.current} of ${process.total}...`)
    })

    PackageToast(result, group.title)
  }

  return (
    <List 
      isLoading={ props.isLoading } 
      searchBarPlaceholder={ props.placeholder }
      onSelectionChange={ setSelection }
      children={
        props.groups.map(group => (
          <GroupSection 
            key={ group.identifier }
            group={ group }
            onInstallPackage={ () => handlePackageInstall(group) }
          />
        ))
      }
      actions={
        <ActionPanel title="Filter by">
        { props.filter != null && props.totalScriptCommands == 0 &&
          <ClearFilterActionItem 
            onFilter={ setFilter }
          />
        }
        </ActionPanel>
      }
    />
  )
}