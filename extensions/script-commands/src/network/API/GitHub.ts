import { 
  showToast, 
  ToastStyle 
} from "@raycast/api"

import fetch from "node-fetch"

import { 
  Main, 
  Group, 
  ScriptCommand 
} from "@models"

import { 
  URLConstants,
  sourceCodeRawURL
} from "@network"

export async function fetchScriptCommands(): Promise<Main | null> {
  const extensionsURL = `${URLConstants.baseRawURL}/extensions.json`

  try {
    const response = await fetch(extensionsURL)
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