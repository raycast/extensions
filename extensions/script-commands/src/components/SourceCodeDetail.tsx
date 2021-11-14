import { 
  useState, 
  useEffect 
} from "react"

import { 
  ActionPanel, 
  CopyToClipboardAction, 
  Detail, 
  OpenInBrowserAction 
} from "@raycast/api"

import { 
  ScriptCommand 
} from "@models"

import { 
  sourceCodeNormalURL 
} from "@urls"

import { 
  DataManager 
} from "@managers"

type Props = {
  scriptCommand: ScriptCommand
}

type ContentState = { 
  hasContent: boolean, 
  sourceCode: string 
}

const dataManager = DataManager.shared()

export function SourceCodeDetail({ scriptCommand}: Props): JSX.Element {
  const title = `Source code for "${scriptCommand.title }"`
  const [content, setContent] = useState<ContentState>({ 
    hasContent: false, 
    sourceCode: "Loading source code..."
  })

  useEffect(() => {
    async function fetch() {
      const response = await dataManager.fetchSourceCode(scriptCommand)

      setContent((oldState) => ({
        ...oldState,
        hasContent: response.length > 0,
        sourceCode: details(
          scriptCommand, 
          response
        )
      }))
    }

    fetch()
  }, [])

  return (
    <Detail 
      navigationTitle={ title }
      isLoading={ content.hasContent == false } 
      markdown={ content.sourceCode }
      actions={ 
        <ActionPanel title={scriptCommand.title}>
          <ActionsSection scriptCommand={scriptCommand} />
        </ActionPanel>
      }
    />
  )
}

function ActionsSection({ scriptCommand }: { scriptCommand: ScriptCommand }): JSX.Element {
  return (
    <ActionPanel.Section>
      <OpenInBrowserAction url={ sourceCodeNormalURL(scriptCommand) } />
      <CopyToClipboardAction title="Copy Script Command URL" content={ sourceCodeNormalURL(scriptCommand) } />
    </ActionPanel.Section>
  )
}

const details = (scriptCommand: ScriptCommand, sourceCode: string): string => {
  let content = `
  Language: ${scriptCommand.language}  
  File: ${scriptCommand.filename}  
  \n\n  
  `
  content += "```" + scriptCommand.language + "\n"
  content += sourceCode
  content += "\n```"

  return content
}
