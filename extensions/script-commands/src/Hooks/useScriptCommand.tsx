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
  useState,
} from "react"

import { 
  useDataManager,
} from "@hooks"

import { 
  Filter,
  State,
} from "@types"

import { 
  iconDarkURLFor, 
  iconLightURLFor, 
  languageURL, 
  sourceCodeNormalURL,
} from "@urls"

import { 
  IconConstants 
} from "@constants"

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
  accessoryTitle: string
  sourceCodeURL: string
  filter: Filter
  state: State
  path?: string
}

type UseScriptCommandState = {
  props: UseScriptCommandProps
  install: () => void
  uninstall: () => void
  confirmSetup: () => void
  setFilter: (filter: Filter) => void
}

type UseScriptCommand = (initialScriptCommand: ScriptCommand) => UseScriptCommandState

export const useScriptCommand: UseScriptCommand = (initialScriptCommand) => {
  const { dataManager, filter, setFilter } = useDataManager()

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

  const confirmSetup = async () => {
    const result = await dataManager.confirmScriptCommandSetup(state.scriptCommand)

    setState((oldState) => ({
      ...oldState, 
      commandState: result.content
    }))
  }
  
  const path = dataManager.commandFileFor(state.scriptCommand.identifier)

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
      filter: filter,
      state: state.commandState,
      path: path?.path
    },
    install,
    uninstall,
    confirmSetup,
    setFilter
  }
}

// ###########################################################################
// ###########################################################################

type AccessoryIconFor = (state: State, language: string) => ImageLike

const accessoryIconFor: AccessoryIconFor = (state, language) => {
  let icon: ImageLike

  if (state == State.Installed)
    icon = IconConstants.Installed

  else if (state == State.NeedSetup)
    icon = IconConstants.NeedSetup

  else if (state == State.ChangesDetected)
    icon = IconConstants.ChangesDetected
    
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

  else if (state == State.NeedSetup || state == State.ChangesDetected) {
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