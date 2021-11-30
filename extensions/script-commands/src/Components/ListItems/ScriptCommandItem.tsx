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

import { 
  useContext,
} from "react"

import { 
  ApplicationContext,
} from "@providers"

type Props = { 
  scriptCommand: ScriptCommand
  group: CompactGroup
}

export function ScriptCommandItem({ scriptCommand, group }: Props): JSX.Element {
  const { setFilter } = useContext(ApplicationContext)
  const { props, install, uninstall, setup } = useScriptCommand(scriptCommand)

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
          <FiltersActionPanel onFilter={ setFilter } />
        </ActionPanel>
      }
    />
  )
}