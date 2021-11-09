import { showToast, ToastStyle } from "@raycast/api"
import fetch from "node-fetch"

import { Author, Main, Group, ScriptCommand } from "@models"

const baseRawContentURL = "https://raw.githubusercontent.com/raycast/script-commands/master/commands"
const baseURL = "https://github.com/raycast/script-commands/blob/master/commands"

const Constants = {
  Regex: {
    emoji: /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/gi,
  },
  extensionsURL: `${baseRawContentURL}/extensions.json`,
  languageImageURL: `${baseRawContentURL}/images`
}

enum IconStyle {
  Light,
  Dark,
}

enum ContentType {
  Raw,
  Normal,
}

export async function fetchScriptCommands(): Promise<Main | null> {
  try {
    const response = await fetch(Constants.extensionsURL)
    const json = await response.json()
    const main = json as Main

    main.groups.sort((left: Group, right: Group) => {
      return (left.name > right.name) ? 1 : -1
    })

    return main
  }
  catch (error) {
    console.error(error)
    showToast(ToastStyle.Failure, "Could not load Script Commands")

    return Promise.resolve(null)
  }
}

export async function fetchSourceCode(scriptCommand: ScriptCommand): Promise<string> {
  try {
    const url = sourceCodeRawURL(scriptCommand)
    const response = await fetch(url)

    return await response.text()
  }
  catch {
    showToast(
      ToastStyle.Failure, 
      `Could not load the source code for ${scriptCommand.title}`
    )

    return Promise.resolve("")
  }
}

export const authorAvatarURL = (author: Author): string => {
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

export const sourceCodeRawURL = (scriptCommand: ScriptCommand) => sourceCodeURL(scriptCommand, ContentType.Raw)

export const sourceCodeNormalURL = (scriptCommand: ScriptCommand) => sourceCodeURL(scriptCommand, ContentType.Normal)

const sourceCodeURL = (scriptCommand: ScriptCommand, type: ContentType): string => {
  const base = type == ContentType.Raw ? baseRawContentURL : baseURL

  return `${base}/${scriptCommand.path}${scriptCommand.filename}`
}

export const languageURL = (language: string) => `${Constants.languageImageURL}/icon-${language}.png`

export const iconDarkURL = (scriptCommand: ScriptCommand) => iconURL(scriptCommand, IconStyle.Dark)

export const iconLightURL = (scriptCommand: ScriptCommand) => iconURL(scriptCommand, IconStyle.Light)

const iconURL = (scriptCommand: ScriptCommand, style: IconStyle): string | null => {
  let path = scriptCommand.icon.light

  if (style == IconStyle.Dark) {
    path = scriptCommand.icon.dark
  }

  if (Constants.Regex.emoji.test(path)) {
    return path
  }

  if (path != null && path != undefined && path.length > 0) {
    const url = `${baseRawContentURL}/${scriptCommand.path}${path}`

    return url
  }

  return null
}