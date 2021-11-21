import { 
  ActionPanel, 
  Color, 
  Icon 
} from "@raycast/api"

import { 
  State 
} from "@types"

type ManagementActionSectionProps = {
  state: State
  onInstall: () => void,
  onUninstall: () => void,
  onSetup: () => void,
}

export function ManagementActionSection({ state, onInstall, onUninstall, onSetup }: ManagementActionSectionProps): JSX.Element | null {
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
        key={`install`} 
        onInstall={ onInstall} 
      />
    )
    break
  
  case State.NeedSetup: 
    elements.push(
      <SetupActionItem 
        key="setup" 
        onSetup={ onSetup } 
      />
    )
    elements.push(uninstallAction)

    break
  
  case State.Error: 
    console.log("[ManagementActionSection] Error")
    return null
  }

  return (
    <ActionPanel.Section>
      { elements }
    </ActionPanel.Section>
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
  onSetup: () => void
}

function SetupActionItem({ onSetup }: SetupActionItemProps): JSX.Element {
  // TODO: Things to implement in the Setup
  /*
  Coisas para fazer aqui:
  - antes de salvar o arquivo do Script Command em disco, pegar o SHA do conteúdo e salvar a hash numa propriedade no Command
    - todas as vezes que passar por esse arquivo, devo checar com algum hook se houve modificação naquele arquivo, 
    - caso o SHA seja diferente daquele que salvei ao persistir o Script Command, vou oferecer uma finalização do setup.
    - Criação de Hash: https://gist.github.com/GuillermoPena/9233069

  - Para editar o arquivo, tenho que chegar se existem alguns programas no sistema. Tais como:
    - VSCode        - <OpenAction title="Open in VSCode" icon={{fileIcon: "/Applications/Visual Studio Code.app"}} target={repo.fullPath} application="Visual Studio Code" />
    - Sublime Text  - <OpenAction title="Open in Sublime Text" icon={{fileIcon: "/Applications/Sublime Text.app"}} target={repo.fullPath} application="Sublime Text" />
    - Xcode         - <OpenAction title="Open in Xcode" icon={{fileIcon: "/Applications/Xcode.app"}} target={repo.fullPath} application="Xcode" />
    - CodeRunner    - <OpenAction title="Open in CodeRunner" icon={{fileIcon: "/Applications/CodeRunner.app"}} target={repo.fullPath} application="CodeRunner" />

  - Ao determinar que foi modificado o arquivo original baixado, devo mostrar como Action principal "Finish Setup" ao invés de "Setup Script Command".
    - Nesse momento, devo renomear o link simbólico removendo o .template do nome
    - Uma idéia é adicionar um novo case no State: "ChangesDetected" pra informar uma mudança de estado no Script Command internamente ao invés de ficar checando na view

  */
  return (
    <ActionPanel.Item 
      icon={ Icon.TextDocument } 
      title="Configure Script Command" 
      onAction={ onSetup }
    />
  )
}