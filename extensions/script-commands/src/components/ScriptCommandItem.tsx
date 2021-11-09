import { ActionPanel, List, ImageMask } from "@raycast/api"

import { iconDarkURL, iconLightURL, languageURL } from "@network"

import { Author, ScriptCommand } from "@models"

type Props = { 
  scriptCommand: ScriptCommand 
}

export function ScriptCommandItem({ scriptCommand }: Props): JSX.Element {
  return (
    <List.Item
      key={scriptCommand.identifier}
      title={scriptCommand.title}
      subtitle={scriptCommand.packageName}
      icon={{
        source: {
          light: iconLightURL(scriptCommand) ?? "",
          dark: iconDarkURL(scriptCommand) ?? "",
        },
      }}
      keywords={keywordsFor(scriptCommand)}
      accessoryIcon={languageURL(scriptCommand.language)}
      accessoryTitle={authorsDescriptionFor(scriptCommand.authors)}
      actions={
        <ActionPanel title={panelTitleFor(scriptCommand)}>
          <AuthorsActionPanel authors={scriptCommand.authors ?? []} />
        </ActionPanel>
      }
    />
  )
}

function AuthorsActionPanel({ authors }: { authors: Author[] }): JSX.Element {
  const count = authors.length
  const suffix = count > 1 ? "s" : ""
  const totalDescription = `Author${suffix}`

  return (
    <ActionPanel.Section title={totalDescription}>
      {authors.map((author) => (
        <AuthorActionItem author={author} />
      ))}
    </ActionPanel.Section>
  )
}

function AuthorActionItem({ author }: { author: Author }): JSX.Element {
  const name = author.name ?? "Raycast"
  
  return <ActionPanel.Item
    title={name}
    icon={{ 
      source: avatarURL(author), 
      mask: ImageMask.Circle 
    }}
  />
}

const avatarURL = (author: Author): string => {
  if (author.url != null && author.url.length > 0) {
    const path = new URL(author.url)

    if (path.host == "twitter.com") {
      return `https://unavatar.io/twitter${path.pathname}`
    }
    else if (path.host == "github.com") {
      return `${author.url}.png?size=100`
    }
  }

  return "https://github.com/raycast.png?size=100"
}

const authorsDescriptionFor = (authors: Author[] | undefined): string => { 
  if (authors != null && authors?.length > 0) {
    let content = "";

    for (const author of authors) {
      if (content.length > 0) {
        content += " and "
      }

      content += author.name
    }

    return `by ${content}`
  }

  return "by Raycast"
}

const panelTitleFor = (scriptCommand: ScriptCommand): string => { 
  let packageName: string = scriptCommand.packageName ?? ""
  
  if (packageName.length > 0) {
    packageName = `[${packageName}]`
  }

  return `${packageName} ${scriptCommand.title}'s details`
}

const keywordsFor = (scriptCommand: ScriptCommand): string[] => { 
  const keywords: string[] = []

  if (scriptCommand.packageName != null) {
    keywords.push(scriptCommand.packageName)
  }

  const authors = scriptCommand.authors
  if (authors != null && authors.length > 0) {
    for (const author of authors) {
      if (author.name != null && author.name.length > 0) {
        keywords.push(author.name)
      }
    }
  }

  if (scriptCommand.language.length > 0) {
    keywords.push(scriptCommand.language)
  }

  return keywords
}
