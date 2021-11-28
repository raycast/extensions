import { 
  ScriptCommand,
} from "@models"

import { 
  Image,
  ImageLike, 
  Color, 
  Icon,
} from "@raycast/api"

import { 
  useState 
} from "react"

import { 
  useDataManager
} from "@hooks"

import { 
  State
} from "@types"

import { 
  iconDarkURLFor, 
  iconLightURLFor, 
  languageURL, 
  sourceCodeNormalURL
} from "@urls"

type ScriptCommandState = {
  commandState: State,
  scriptCommand: ScriptCommand
}

interface UseScriptCommandProps {
  identifier: string
  title: string
  subtitle: string
  icon: ImageLike
  keywords: string[]
  accessoryIcon: ImageLike
  accessoryTitle: string,
  sourceCodeURL: string
  state: State,
}

type UseScriptCommandState = {
  props: UseScriptCommandProps
  install: () => void
  uninstall: () => void
  setup: () => void
}

type UseScriptCommand = (initialScriptCommand: ScriptCommand) => UseScriptCommandState

export const useScriptCommand: UseScriptCommand = (initialScriptCommand) => {
  const { dataManager } = useDataManager()

  // const stateForCommand = dataManager.stateFor(initialScriptCommand)
  const [state, setState] = useState<ScriptCommandState>({
    commandState: dataManager.stateFor(initialScriptCommand), 
    scriptCommand: initialScriptCommand
  })

  const install = async () => {
    const result = await dataManager.installScriptCommand(state.scriptCommand)

    setState((oldState) => ({
      ...oldState, 
      commandState: result.content
    }))
  }

  const uninstall = async () => {
    const result = await dataManager.deleteScriptCommand(state.scriptCommand)

    setState((oldState) => ({
      ...oldState, 
      commandState: result.content
    }))
  }
  
  const setup = async () => {
    console.log("TODO: Implement setup")
  }
  
  return {
    props: {
      identifier: state.scriptCommand.identifier,
      title: state.scriptCommand.title,
      subtitle: state.scriptCommand.packageName ?? "",
      icon: iconFor(state.scriptCommand),
      keywords: keywordsFor(state.scriptCommand, state.commandState),
      accessoryIcon: accessoryIconFor(state.commandState, state.scriptCommand.language),
      accessoryTitle: accessoryTitleFor(state.scriptCommand),
      sourceCodeURL: sourceCodeNormalURL(state.scriptCommand),
      state: state.commandState
    },
    install,
    uninstall,
    setup
  }
}

// ###########################################################################
// ###########################################################################

type AccessoryIconFor = (state: State, language: string) => ImageLike

const accessoryIconFor: AccessoryIconFor = (state, language) => {
  let icon: ImageLike

  if (state == State.Installed)
    icon = { 
      source: Icon.Checkmark, 
      tintColor: Color.Green
    }

  else if (state == State.NeedSetup)
    icon = { 
      source: Icon.Gear, 
      tintColor: Color.Green
    }

  else
    icon = { 
      source: languageURL(language) 
    }

  return icon
}

// ###########################################################################
// ###########################################################################

type AccessoryTitleFor = (scriptCommand: ScriptCommand) => string

const accessoryTitleFor: AccessoryTitleFor = (scriptCommand) => { 
  const defaultAuthor = "by Raycast"
  
  if (scriptCommand.authors == null || scriptCommand.authors == undefined)
    return defaultAuthor

  const authors = scriptCommand.authors

  if (authors.length == 0)
    return defaultAuthor

  let content = ""

  authors.forEach(author => {
    if (content.length > 0)
      content += " and "  
    content += author.name
  })

  return `by ${content}`
}

// ###########################################################################
// ###########################################################################

type KeywordsIconFor = (scriptCommand: ScriptCommand, state: State) => string[]

const keywordsFor: KeywordsIconFor = (scriptCommand, state) => { 
  const keywords: string[] = []

  const packageName = scriptCommand.packageName

  if (packageName != undefined && packageName != "")
    keywords.push(packageName)

  const authors = scriptCommand.authors

  if (authors != undefined && authors.length > 0) {
    authors.forEach(author => {
      const name = author.name

      if (name != undefined && name != "") {
        name.split(" ").forEach(
          value => keywords.push(value)
        )
      }
    })
  }

  if (scriptCommand.language != "")
    keywords.push(scriptCommand.language)

  if (state == State.Installed)
    keywords.push("installed")

  else if (state == State.NeedSetup) {
    keywords.push("installed")
    keywords.push("setup")
  }

  if (scriptCommand.isTemplate)
    keywords.push("template")

  return keywords
}

// ###########################################################################
// ###########################################################################

type IconFor = (scriptCommand: ScriptCommand) => Image

const iconFor: IconFor = (scriptCommand)=> {
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