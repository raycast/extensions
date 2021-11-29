import { 
  ActionPanel, 
  Icon, 
  OpenInBrowserAction, 
  PushAction,
} from "@raycast/api"

import { 
  SourceCodeDetail,
} from "@components"

import { 
  ScriptCommand,
} from "@models"

type ViewsActionPanelProps = {
  url: string,
  scriptCommand: ScriptCommand
}

export function ViewsActionPanel({ url, scriptCommand }: ViewsActionPanelProps): JSX.Element {
  return (
    <ActionPanel.Section>
      <ViewSourceCodeAction scriptCommand={ scriptCommand } />
      <OpenInBrowserAction 
        url={ url }
        shortcut={{ 
          modifiers: ["cmd"], 
          key: "o" 
        }}
      />
    </ActionPanel.Section>
  )
}

type ViewSourceCodeActionProps = {
  scriptCommand: ScriptCommand
}

function ViewSourceCodeAction({ scriptCommand }: ViewSourceCodeActionProps): JSX.Element {
  return (
    <PushAction
      icon={ Icon.TextDocument } 
      shortcut={{ 
        modifiers: ["cmd", "shift"], 
        key: "s" 
      }}
      title="View Source Code" 
      target={ 
        <SourceCodeDetail 
          scriptCommand={ scriptCommand } 
        />
      }
    />
  )
}