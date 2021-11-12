// Raycast

import { 
  useNavigation, 
  ActionPanel, 
  Icon, 
  ImageMask, 
  Image, 
  List, 
  OpenInBrowserAction 
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
  SourceCodeDetail 
} from "@components"

import { 
  DataManager 
} from "@managers"

// External

import 
  * as crypto 
from "crypto"

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
          <InstallActionSection scriptCommand={scriptCommand} />
          <ViewsActionSection scriptCommand={scriptCommand} />
          <AuthorsActionPanel authors={scriptCommand.authors ?? []} />
        </ActionPanel>
      }
    />
  )
}

function InstallActionSection({ scriptCommand }: { scriptCommand: ScriptCommand }): JSX.Element {
  return (
    <ActionPanel.Section>
      <InstallActionItem scriptCommand={ scriptCommand } />
    </ActionPanel.Section>
  )
}

function InstallActionItem({ scriptCommand }: { scriptCommand: ScriptCommand }): JSX.Element {
  return (
    <ActionPanel.Item 
      icon={ Icon.Download } 
      title="Install Script Command" 
      onAction={ 
        async () => await dataManager.download(scriptCommand) 
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
  const { push } = useNavigation();
  
  const action = () => {
    push(
      <SourceCodeDetail 
        scriptCommand={scriptCommand } 
      />
    )
  }
  
  return (
    <ActionPanel.Item 
      icon={ Icon.TextDocument } 
      shortcut={{ 
        modifiers: ["cmd"], 
        key: "return" 
      }}
      title="View Source Code" 
      onAction={ action } 
    />
  )
}

function AuthorsActionPanel({ authors }: { authors: Author[] }): JSX.Element {
  const count = authors.length
  const suffix = count > 1 ? "s" : ""
  const totalDescription = `Author${suffix}`

  return (
    <ActionPanel.Section title={ totalDescription }>
      {authors.map((author) => (
        <AuthorActionItem 
        key={ author.url ?? crypto.randomUUID() } 
        author={ author } />
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

    for (const author of authors) {
      if (content.length > 0)
        content += " and "

      content += author.name
    }

    return `by ${content}`
  }

  return "by Raycast"
}

const keywords = (scriptCommand: ScriptCommand): string[] => { 
  const keywords: string[] = []

  if (scriptCommand.packageName != null) {
    keywords.push(scriptCommand.packageName)
  }

  const authors = scriptCommand.authors
  if (authors != null && authors.length > 0) {
    for (const author of authors) {
      if (author.name != null && author.name.length > 0)
        keywords.push(author.name)
    }
  }

  if (scriptCommand.language.length > 0)
    keywords.push(scriptCommand.language)

  return keywords
}
