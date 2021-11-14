// Raycast

import { 
  ActionPanel, 
  Icon, 
  ImageMask, 
  Image, 
  List, 
  OpenInBrowserAction, 
  Color,
  PushAction
} from "@raycast/api"

// Script Commands Store 

import { 
  authorAvatarURL, 
  iconDarkURL, 
  iconLightURL, 
  languageURL, 
  sourceCodeNormalURL 
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

type Props = { 
  scriptCommand: ScriptCommand
}

const dataManager = DataManager.shared()

export function ScriptCommandItem({ scriptCommand }: Props): JSX.Element {
  return (
    <List.Item
      key={ scriptCommand.identifier }
      title={scriptCommand.title}
      subtitle={scriptCommand.packageName}
      icon={{
        source: {
          light: iconLightURL(scriptCommand) ?? "",
          dark: iconDarkURL(scriptCommand) ?? "",
        },
      }}
      keywords={keywords(scriptCommand)}
      accessoryIcon={languageURL(scriptCommand.language)}
      accessoryTitle={authorsDescription(scriptCommand.authors)}
      actions={
        <ActionPanel title={scriptCommand.title}>
          <ManagementActionSection scriptCommand={scriptCommand} />
          <ViewsActionSection scriptCommand={scriptCommand} />
          <AuthorsActionPanel authors={scriptCommand.authors ?? []} />
        </ActionPanel>
      }
    />
  )
}

function ManagementActionSection({ scriptCommand }: { scriptCommand: ScriptCommand }): JSX.Element | null {
  type Refresh = { refresh: boolean }
  
  const elements: JSX.Element[] = [] 

  const state = dataManager.stateFor(scriptCommand)
  const [, setRefresh] = useState<Refresh>({ refresh: false })

  const uninstallAction = (
    <UninstallActionItem
      key={`uninstall-${scriptCommand.identifier}`}
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
        key={`install-${scriptCommand.identifier}`}
        scriptCommand={ scriptCommand } 
        onAction={ 
          () => {
            console.log("Install Action called")
            setRefresh(oldState => ({
              ...oldState, 
              refresh: true 
            }))
          }
        }
      />
    )
    break
  
  case State.NeedSetup: 
    elements.push(
      <SetupActionItem
        key={`setup-${scriptCommand.identifier}`} 
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
        title="View Source Code in Browser" 
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

  if (author.url != null && author.url.length > 0) {
    const path = new URL(author.url)

    if (path.host == "twitter.com")
      name = `${name} (Twitter)`
    else if (path.host == "github.com")
      name = `${name} (GitHub)`
  }
  
  if (author.url != null) {
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

  return keywords
}
