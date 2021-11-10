import { 
  ScriptCommand 
} from "@models"

import { 
  URLConstants 
} from "@network"

export const Regex = {
  emoji: /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/gi,
}

enum IconStyle {
  Light,
  Dark,
}

export const iconDarkURL = (scriptCommand: ScriptCommand) => iconURL(scriptCommand, IconStyle.Dark)

export const iconLightURL = (scriptCommand: ScriptCommand) => iconURL(scriptCommand, IconStyle.Light)

const iconURL = (scriptCommand: ScriptCommand, style: IconStyle): string | null => {
  let path = scriptCommand.icon.light

  if (style == IconStyle.Dark) {
    path = scriptCommand.icon.dark
  }

  if (Regex.emoji.test(path)) {
    return path
  }

  if (path != null && path != undefined && path.length > 0) {
    const url = `${URLConstants.baseRawURL}/${scriptCommand.path}${path}`

    return url
  }

  return null
}