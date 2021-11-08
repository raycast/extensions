import { List } from "@raycast/api"

import { iconDarkURL, iconLightURL, languageURL } from "@network"

import { Author, ScriptCommand } from "@models"

type Props = { 
  scriptCommand: ScriptCommand
}

export function ScriptCommandItem({ scriptCommand }: Props) {
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
      keywords={[scriptCommand.packageName]}
      accessoryIcon={languageURL(scriptCommand.language)}
      accessoryTitle={author(scriptCommand.authors) ?? ""}
    />
  )
}

function author(authors: Author[] | null): string | null {
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

  return null
}
