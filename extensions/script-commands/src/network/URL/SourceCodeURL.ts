import { 
  ScriptCommand 
} from "@models"

import { 
  URLConstants 
} from "@urls"

enum ContentType {
  Raw,
  Normal,
}

export const sourceCodeRawURL = (scriptCommand: ScriptCommand) => sourceCodeURL(scriptCommand, ContentType.Raw)

export const sourceCodeNormalURL = (scriptCommand: ScriptCommand) => sourceCodeURL(scriptCommand, ContentType.Normal)

const sourceCodeURL = (scriptCommand: ScriptCommand, type: ContentType): string => {
  const base = type == ContentType.Raw ? URLConstants.baseRawURL : URLConstants.baseURL

  return `${base}/${scriptCommand.path}${scriptCommand.filename}`
}

