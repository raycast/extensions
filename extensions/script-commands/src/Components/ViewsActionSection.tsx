import { 
  SourceCodeDetail 
} from "@components"

import { 
  ScriptCommand 
} from "@models"

import { 
  ActionPanel, 
  Icon, 
  OpenInBrowserAction, 
  PushAction 
} from "@raycast/api"

type ViewsActionSectionProps = {
  url: string,
  scriptCommand: ScriptCommand
}

export function ViewsActionSection({ url, scriptCommand }: ViewsActionSectionProps): JSX.Element {
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
        modifiers: ["cmd"], 
        key: "return" 
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