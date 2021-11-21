import { 
  ActionPanel, 
  List, 
} from "@raycast/api"

import { 
  AuthorsActionPanel,
  ManagementActionSection,
  StoreToast,
  ViewsActionSection
} from "@components"

import {
  useScriptCommand 
} from "@hooks"

import { 
  ScriptCommand 
} from "@models"

import { 
  Progress, State
} from "@types"

type Props = { 
  scriptCommand: ScriptCommand
}

export function ScriptCommandItem({ scriptCommand }: Props): JSX.Element {
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
          <ManagementActionSection 
            state={ props.state }
            onInstall={ handleInstall } 
            onUninstall={ handleUninstall }
            onSetup={ handleSetup }
          />
          <ViewsActionSection 
            url={ props.sourceCodeURL } 
            scriptCommand={ scriptCommand } 
          />
          <AuthorsActionPanel 
            authors={ scriptCommand.authors ?? [] } 
          />
        </ActionPanel>
      }
    />
  )
}