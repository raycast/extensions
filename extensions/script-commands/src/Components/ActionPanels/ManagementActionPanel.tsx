import { 
  ActionPanel, 
  Color, 
  Icon,
  OpenAction,
} from "@raycast/api"

import { 
  State,
} from "@types"

type ManagementActionPanelProps = {
  state: State
  commandPath?: string
  onInstall: () => void
  onUninstall: () => void
  onSetup: () => void
  onConfirmSetup: () => void
}

export function ManagementActionPanel({ state, commandPath, onInstall, onUninstall, onSetup, onConfirmSetup }: ManagementActionPanelProps): JSX.Element | null {
  const elements: JSX.Element[] = [] 

  const uninstallAction = (
    <UninstallActionItem 
      key="uninstall" 
      onUninstall={ onUninstall } 
    />
  )

  switch (state) {
  case State.Installed: 
    elements.push(uninstallAction)
    break
  
  case State.NotInstalled: 
    elements.push(
      <InstallActionItem 
        key="install"
        onInstall={ onInstall} 
      />
    )
    break
  
  case State.NeedSetup: 
    if (commandPath) {
      elements.push(
        <SetupActionItem 
          key="setup" 
          path={ commandPath }
          onSetup={ onSetup } 
        />
      )
    }

    elements.push(uninstallAction)

    break
  
  case State.ChangesDetected: 
    elements.push(
      <ConfirmChangeActionItem 
        key="confirm-setup" 
        onConfirmSetup={ onConfirmSetup } 
      />
    )
    elements.push(uninstallAction)

    break
  }

  return (
    <ActionPanel.Section 
      children={ elements } 
    />
  )
}

type InstallActionItemProps = {
  onInstall: () => void
}

function InstallActionItem({ onInstall }: InstallActionItemProps): JSX.Element {  
  return (
    <ActionPanel.Item 
      icon={ Icon.Download } 
      title="Install Script Command" 
      onAction={ onInstall }
    />
  )
}

type UninstallActionItemProps = {
  onUninstall: () => void
}

function UninstallActionItem({ onUninstall }: UninstallActionItemProps): JSX.Element {
  return (
    <ActionPanel.Item 
      icon={{ 
        source: Icon.XmarkCircle, 
        tintColor: Color.Red 
      }} 
      title="Uninstall Script Command" 
      shortcut={{ 
        modifiers: ["ctrl"], 
        key: "x" 
      }}
      onAction={ onUninstall }
    />
  )
}

type SetupActionItemProps = {
  path: string
  onSetup: () => void
}

function SetupActionItem({ path, onSetup }: SetupActionItemProps): JSX.Element {
  return (
    <OpenAction 
      icon={ Icon.Pencil } 
      title="Configure Script Command" 
      target={ path }
      onOpen={ onSetup }
    />
  )
}

type ConfirmChangeActionItemProps = {
  onConfirmSetup: () => void
}

function ConfirmChangeActionItem({ onConfirmSetup }: ConfirmChangeActionItemProps): JSX.Element {
  return (
    <ActionPanel.Item 
      icon={ Icon.TextDocument } 
      title="Confirm Changes on Script Command" 
      onAction={ onConfirmSetup }
    />
  )
}