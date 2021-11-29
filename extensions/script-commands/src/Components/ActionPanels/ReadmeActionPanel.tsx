import { 
  ReadmeDetail,
} from "@components"

import { 
  Group,
} from "@models"

import { 
  ActionPanel, 
  Icon, 
  OpenInBrowserAction, 
  PushAction,
} from "@raycast/api"

import { 
  readmeNormalURL,
} from "@urls"

type ReadmeActionPanelProps = {
  group: Group
}

export function ReadmeActionPanel({ group }: ReadmeActionPanelProps): JSX.Element {
  let normalURL: string | undefined = undefined
  const readme = group.readme

  if (readme != undefined && readme.length > 0)
    normalURL = readmeNormalURL(readme)

  return (
    <ActionPanel.Section title="Package Information">
      <ViewReadmeAction group={ group } />
      { 
        normalURL != undefined && 
          <OpenInBrowserAction 
            url={ normalURL }
            shortcut={{ 
              modifiers: ["cmd"], 
              key: "o" 
            }}
          />
      }
    </ActionPanel.Section>
  )
}

type ViewReadmeActionProps = {
  group: Group
}

function ViewReadmeAction({ group }: ViewReadmeActionProps): JSX.Element {
  return (
    <PushAction
      icon={ Icon.TextDocument } 
      shortcut={{ 
        modifiers: ["cmd", "shift"], 
        key: "r" 
      }}
      title="View README" 
      target={ 
        <ReadmeDetail 
          group={ group } 
        />
      }
    />
  )
}