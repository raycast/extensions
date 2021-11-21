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
  useSourceCode 
} from "Hooks/useSourceCode"

type Props = {
  scriptCommand: ScriptCommand
}

export function SourceCodeDetail({ scriptCommand}: Props): JSX.Element {
  const { props } = useSourceCode(scriptCommand)

  return (
    <Detail 
      navigationTitle={ props.title }
      isLoading={ props.isLoading } 
      markdown={  props.sourceCode }
      actions={ 
        <ActionPanel title={ props.title }>
          <ActionsSection url={ props.sourceCodeURL } />
        </ActionPanel>
      }
    />
  )
}

function ActionsSection({ url }: { url: string }): JSX.Element {
  return (
    <ActionPanel.Section>
      <OpenInBrowserAction url={ url } />
      <CopyToClipboardAction title="Copy Script Command URL" content={ url } />
    </ActionPanel.Section>
  )
}