// Raycast

import { 
  ActionPanel, 
  Icon, 
  ImageMask, 
  Image, 
  List, 
  OpenInBrowserAction, 
  Color,
  PushAction,
  ImageLike
} from "@raycast/api"

// Script Commands Store 

import { 
  authorAvatarURL, 
  iconDarkURLFor, 
  iconLightURLFor, 
  languageURL, 
  sourceCodeNormalURL,
  checkIsValidURL
} from "@urls"

import { 
  Author, 
  ScriptCommand 
} from "@models"

import { 
  Progress,
  SourceCodeDetail, 
  StoreToast 
} from "@components"

import { 
  DataManager,
  State
} from "@managers"

// External

import 
  * as crypto 
from "crypto"

import { 
  useState
} from "react"

// Internal 

type Refresh = { 
  refresh: boolean 
}

type Props = { 
  scriptCommand: ScriptCommand
}

const dataManager = DataManager.shared()

export function ScriptCommandItem({ scriptCommand }: Props): JSX.Element {
  const [, setRefresh] = useState<Refresh>({ refresh: false })
  
  return (
    <List.Item
      key={ scriptCommand.identifier }
      title={ scriptCommand.title }
      subtitle={ scriptCommand.packageName }
      icon={ iconFor(scriptCommand) }
      keywords={ keywords(scriptCommand) }
      accessoryIcon={ accessoryIconFor(scriptCommand) }
      accessoryTitle={ authorsDescription(scriptCommand.authors) }
      actions={
        <ActionPanel title={ scriptCommand.title }>
          <ManagementActionSection 
            scriptCommand={ scriptCommand } 
            onStateChanged={ 
              () => {
                setRefresh(oldState => ({
                  ...oldState, 
                  refresh: true 
                }))
              }
            } 
          />
          <ViewsActionSection scriptCommand={ scriptCommand } />
          <AuthorsActionPanel authors={ scriptCommand.authors ?? [] } />
        </ActionPanel>
      }
    />
  )
}

function ManagementActionSection({ scriptCommand, onStateChanged }: { scriptCommand: ScriptCommand, onStateChanged: () => void }): JSX.Element | null {
  const elements: JSX.Element[] = [] 

  const state = dataManager.stateFor(scriptCommand)
  const [, setRefresh] = useState<Refresh>({ refresh: false })

  const uninstallAction = (
    <UninstallActionItem
      key={`uninstall-${ scriptCommand.identifier }`}
      scriptCommand={ scriptCommand } 
      onAction={ 
        () => {
          console.log("Uninstall Action called")
          setRefresh(oldState => ({
            ...oldState, 
            refresh: true 
          }))
        }
      }
    />
  )

  switch (state) {
  case State.Installed: 
    elements.push(uninstallAction)
    break
  
  case State.NotInstalled: 
    elements.push(
      <InstallActionItem
        key={`install-${ scriptCommand.identifier }`}
        scriptCommand={ scriptCommand } 
        onAction={ 
          () => {
            setRefresh(oldState => ({
              ...oldState, 
              refresh: true 
            }))

            onStateChanged()
          }
        }
      />
    )
    break
  
  case State.NeedSetup: 
    elements.push(
      <SetupActionItem
        key={`setup-${ scriptCommand.identifier }`} 
        scriptCommand={scriptCommand} 
        onAction={ 
          () => {
            console.log(`[onAction] SetupActionItem`)
          }
        }
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

function InstallActionItem({ scriptCommand, onAction }: { scriptCommand: ScriptCommand, onAction: () => void }): JSX.Element {  
  return (
    <ActionPanel.Item 
      icon={ Icon.Download } 
      title="Install Script Command" 
      onAction={ 
        async () => {
          await StoreToast(State.NotInstalled, Progress.InProgress, scriptCommand)
          const result = await dataManager.download(scriptCommand)

          await StoreToast(result.content, Progress.Finished, scriptCommand)
          onAction()
        }
      } 
    />
  )
}

function UninstallActionItem({ scriptCommand, onAction }: { scriptCommand: ScriptCommand, onAction: () => void }): JSX.Element {
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
      onAction={ 
        () => {
          console.log(`[TODO] Implement Script Command uninstall (${scriptCommand.title})`)
          onAction()
        }
      } 
    />
  )
}

function SetupActionItem({ scriptCommand, onAction }: { scriptCommand: ScriptCommand, onAction: () => void }): JSX.Element {
  return (
    <ActionPanel.Item 
      icon={ Icon.TextDocument } 
      title="Configure Script Command" 
      onAction={ 
        () => {
          console.log(`[TODO] Implement Script Command setup (${scriptCommand.title})`)
          onAction()
        }
      }
    />
  )
}

function ViewsActionSection({ scriptCommand }: { scriptCommand: ScriptCommand }): JSX.Element {
  return (
    <ActionPanel.Section>
      <ViewSourceCodeAction scriptCommand={ scriptCommand } />
      <OpenInBrowserAction 
        url={ sourceCodeNormalURL(scriptCommand) }
        shortcut={{ 
          modifiers: ["cmd"], 
          key: "o" 
        }}
      />
    </ActionPanel.Section>
  )
}

function ViewSourceCodeAction({ scriptCommand }: { scriptCommand: ScriptCommand }): JSX.Element {
  return (
    <PushAction
      icon={ Icon.TextDocument } 
      shortcut={{ 
        modifiers: ["cmd"], 
        key: "return" 
      }}
      title="View Source Code" 
      target={ 
        <SourceCodeDetail 
          scriptCommand={scriptCommand } 
        />
      }
    />
  )
}

function AuthorsActionPanel({ authors }: { authors: Author[] }): JSX.Element {
  const count = authors.length
  const suffix = count > 1 ? "s" : ""
  const totalDescription = `Author${suffix}`

  return (
    <ActionPanel.Section title={ totalDescription }>
      {authors.map(author => (
        <AuthorActionItem 
          key={ author.url ?? crypto.randomUUID() } 
          author={ author } 
        />
      ))}
    </ActionPanel.Section>
  )
}

function AuthorActionItem({ author }: { author: Author }): JSX.Element {
  let name = author.name ?? "Raycast"

  if (author.url != null && author.url.length > 0 && checkIsValidURL(author.url)) {
    const path = new URL(author.url)

    if (path.host == "twitter.com")
      name = `${name} (Twitter)`
    else if (path.host == "github.com")
      name = `${name} (GitHub)`
  }

  if (author.url != null && author.url.length > 0 && checkIsValidURL(author.url)) {
    return <OpenInBrowserAction
      title={ name }
      icon={ avatarImage(author) }
      url={ author.url }
    />
  }
  else {
    return <ActionPanel.Item 
      title={ name }
      icon={ avatarImage(author) }
    />
  }
}

const avatarImage = (author: Author): Image => {
  return { 
    source: authorAvatarURL(author), 
    mask: ImageMask.Circle 
  }
}

const authorsDescription = (authors: Author[] | undefined): string => { 
  if (authors != null && authors?.length > 0) {
    let content = "";

    authors.forEach(author => {
      if (content.length > 0)
        content += " and "  
      content += author.name
    })

    return `by ${content}`
  }

  return "by Raycast"
}

const keywords = (scriptCommand: ScriptCommand): string[] => { 
  const keywords: string[] = []

  if (scriptCommand.packageName != null)
    keywords.push(scriptCommand.packageName)

  const authors = scriptCommand.authors
  if (authors != null && authors.length > 0) {
    authors.forEach(author => {
      if (author.name != null && author.name.length > 0)
        keywords.push(author.name)
    })
  }

  if (scriptCommand.language.length > 0)
    keywords.push(scriptCommand.language)
  
  if (dataManager.isCommandDownloaded(scriptCommand.identifier))
    keywords.push("installed")

  if (scriptCommand.isTemplate)
    keywords.push("setup")

  return keywords
}

const accessoryIconFor = (scriptCommand: ScriptCommand): ImageLike => {
  let icon: ImageLike

  if (dataManager.isCommandDownloaded(scriptCommand.identifier))
    icon = { 
      source: Icon.Checkmark, 
      tintColor: Color.Green
    }
  else 
    icon = { 
      source: languageURL(scriptCommand.language) 
    }
  
  return icon
}

const iconFor = (scriptCommand: ScriptCommand): Image => {
  const iconDark = iconDarkURLFor(scriptCommand)
  const iconLight = iconLightURLFor(scriptCommand)

  const image: Image = {
    source: {
      light: iconLight != null ? iconLight.content : "",
      dark: iconDark != null ? iconDark.content : ""
    }
  }

  return image
}