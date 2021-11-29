import 
  fetch 
from "node-fetch"

import { 
  showToast, 
  ToastStyle 
} from "@raycast/api"

import { 
  Main, 
  Group, 
  ScriptCommand 
} from "@models"

import { 
  URLConstants,
  sourceCodeRawURL,
  readmeRawURL
} from "@urls"

import path from "path"

export async function fetchScriptCommands(): Promise<Main> {
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

    return Promise.resolve({
      groups: [],
      totalScriptCommands: 0,
      languages: []
    })
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

export async function fetchReadme(path: string): Promise<string> {
  try {
    const url = readmeRawURL(path)
    const response = await fetch(url)
    const content = await response.text()
    const markdown = markdownNormalized(content, path)

    return markdown
  }
  catch {
    showToast(
      ToastStyle.Failure, 
      `Could not load the README for path ${path}`
    )

    return Promise.resolve("")
  }
}

type MarkdownNormalized = (markdown: string, readmePath: string) => string

const markdownNormalized: MarkdownNormalized = (markdown, readmePath) => {
  const groupPath = path.parse(readmePath).dir
  const expression = /!\[[A-Za-z0-9\-.]+\]\(([A-Za-z0-9\-.\\/_]+)\)/gm

  const content = markdown.replace(expression, (_match, path: string) => {
    if (path.length > 0 && (path.startsWith("http") == false || path.startsWith("https") == false))
        return `![](${URLConstants.baseRawURL}/${groupPath}/${path})`

    return path
  })

  return content
}