import { 
  ActionPanel, 
  List,
  showHUD,
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

type Props = { 
  scriptCommand: ScriptCommand
  group: CompactGroup
}

export function ScriptCommandItem({ scriptCommand, group }: Props): JSX.Element {
  const { props, install, uninstall, confirmSetup, editSourceCode, setFilter } = useScriptCommand(scriptCommand)

  const handleInstall = async () => {
    await StoreToast(props.state, Progress.InProgress, scriptCommand.title)

    install()

    await StoreToast(props.state, Progress.Finished, scriptCommand.title)
  }
  
  const handleUninstall = async () => {
    await StoreToast(State.Installed, Progress.InProgress, scriptCommand.title)

    uninstall()

    await StoreToast(State.Installed, Progress.Finished, scriptCommand.title)
  }

  const handleSetup = () => {
    showHUD(`Opening ${props.title}'s file to be configured...`)
  }

  const handleEditLocal = () => {
    editSourceCode()
    showHUD(`Opening ${props.title}'s local source code to be edited...`)
  }

  return (
    <List.Item
      id={ props.identifier }
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
            commandPath={ props.path }
            onInstall={ handleInstall } 
            onUninstall={ handleUninstall }
            onSetup={ handleSetup }
            onConfirmSetup={ confirmSetup }
            onEditLocal={ handleEditLocal }
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