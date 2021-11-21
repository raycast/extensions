import { 
  useDataManager 
} from "@hooks"

import { 
  ScriptCommand 
} from "@models"
import { sourceCodeNormalURL } from "@urls"

import { 
  useEffect,
  useState 
} from "react"

type SourceCodeState = {
  content: string,
  shouldReload: boolean,
  scriptCommand: ScriptCommand
}

type UseSourceCodeProps = {
  title: string,
  language: string,
  isLoading: boolean,
  sourceCodeURL: string,
  sourceCode: string
}

type UseSourceCodeState = {
  props: UseSourceCodeProps,
  reloadData: () => void
}

type UseSourceCode = (initialScriptCommand: ScriptCommand) => UseSourceCodeState

export const useSourceCode: UseSourceCode = (initialScriptCommand) => {
  const { dataManager } = useDataManager()

  const [state, setState] = useState<SourceCodeState>({
    content: "",
    shouldReload: true,
    scriptCommand: initialScriptCommand
  })

  const reloadData = () => {
    setState((oldState) => ({
      ...oldState, 
      shouldReload: true
    }))
  }

  useEffect(() => {
    const fetch = async () => {
      const result = await dataManager.fetchSourceCode(state.scriptCommand)
  
      setState((oldState) => ({
        ...oldState, 
        content: result
      }))
    }
    
    if (state.shouldReload == false)
      return

    fetch()
  }, [state])
  
  return {
    props: {
      title: state.scriptCommand.title,
      language: state.scriptCommand.language,
      isLoading: state.content.length == 0,
      sourceCodeURL: sourceCodeNormalURL(state.scriptCommand),
      sourceCode: details(
        state.scriptCommand.language, 
        state.scriptCommand.filename,
        state.content
      )
    },
    reloadData
  }
}

type Details = (language: string, file: string, sourceCode: string) => string

const details: Details = (language, filename, sourceCode) => {
  let content = `
  Language: ${language}  
  File: ${filename}  
  \n\n  
  `
  content += "```" + language + "\n"
  content += sourceCode
  content += "\n```"

  return content
}
