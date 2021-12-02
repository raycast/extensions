import { 
  ActionPanel, 
  List, 
} from "@raycast/api"

import { 
  AuthorsActionPanel,
  FiltersActionPanel,
  ManagementActionPanel,
  ReadmeActionPanel,
  StoreToast,
  ViewsActionPanel,
} from "@components"

import {
  useFilter,
  useScriptCommand,
} from "@hooks"

import { 
  CompactGroup,
  ScriptCommand,
} from "@models"

import { 
  Progress, 
  State,
} from "@types"

type Props = { 
  scriptCommand: ScriptCommand
  group: CompactGroup
}

export function ScriptCommandItem({ scriptCommand, group }: Props): JSX.Element {
  const { props, install, uninstall, setup, setFilter } = useScriptCommand(scriptCommand)

  const handleInstall = async () => {
    await StoreToast(props.state, Progress.InProgress, scriptCommand)

    install()

    await StoreToast(props.state, Progress.Finished, scriptCommand)
  }
  
  const handleUninstall = async () => {
    await StoreToast(State.Installed, Progress.InProgress, scriptCommand)

    uninstall()

    await StoreToast(State.Installed, Progress.Finished, scriptCommand)
  }

  const handleSetup = () => {
    setup()
  }

  return (
    <List.Item
      key={ props.identifier }
      title={ props.title }
      subtitle={ props.subtitle }
      icon={ props.icon }
      keywords={ props.keywords }
      accessoryIcon={ props.accessoryIcon }
      accessoryTitle={ props.accessoryTitle }
      actions={
        <ActionPanel title={ props.title }>
          <ManagementActionPanel 
            state={ props.state }
            onInstall={ handleInstall } 
            onUninstall={ handleUninstall }
            onSetup={ handleSetup }
          />
          <ViewsActionPanel 
            url={ props.sourceCodeURL } 
            scriptCommand={ scriptCommand } 
          />
          <AuthorsActionPanel 
            authors={ scriptCommand.authors ?? [] } 
          />
          { group.readme != undefined && group.readme.length > 0 &&
            <ReadmeActionPanel group={ group } /> 
          }
          <FiltersActionPanel 
            filter={ props.filter } 
            onFilter={ setFilter } 
          />
        </ActionPanel>
      }
    />
  )
}