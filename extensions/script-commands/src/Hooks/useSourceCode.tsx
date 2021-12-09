import { 
  useDataManager,
} from "@hooks"

import { 
  ScriptCommand,
} from "@models"

import { 
  sourceCodeNormalURL,
} from "@urls"

import { 
  useEffect,
  useState,
} from "react"

type SourceCodeState = {
  content: string
  scriptCommand: ScriptCommand
}

type UseSourceCodeProps = {
  title: string
  isLoading: boolean
  sourceCodeURL: string
  sourceCode: string
}

type UseSourceCode = (initialScriptCommand: ScriptCommand) => UseSourceCodeProps

export const useSourceCode: UseSourceCode = (initialScriptCommand) => {
  
  const { dataManager } = useDataManager()

  const [state, setState] = useState<SourceCodeState>({
    content: "",
    scriptCommand: initialScriptCommand
  })

  useEffect(() => {
    let abort = false

    const fetch = async () => {
      const result = await dataManager.fetchSourceCode(state.scriptCommand)
  
      if (abort == false) {
        setState((oldState) => ({
          ...oldState, 
          content: result
        }))
      }
    }

    fetch()

    return () => {
      abort = true
    }
  }, [state])
  
  return {
    title: state.scriptCommand.title,
    isLoading: state.content.length === 0,
    sourceCodeURL: sourceCodeNormalURL(state.scriptCommand),
    sourceCode: details(
      state.scriptCommand.language, 
      state.scriptCommand.filename,
      state.content
    )
  }
}

type Details = (language: string, file: string, sourceCode: string) => string

const details: Details = (language, filename, sourceCode) => {
  let content = `
  Language: **${language}**  
  File: **${filename}**  
  \n\n  
  `
  content += "```" + language + "\n"
  content += sourceCode
  content += "\n```"

  return content
}
