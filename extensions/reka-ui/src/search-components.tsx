import { ActionPanel, Action, List, getPreferenceValues } from '@raycast/api'
import { useMemo } from 'react'

import { ComponentDetails } from './component-details'
import { useRekaComponents } from './hooks/use-reka-components'

export default function Command() {
  const { components } = useRekaComponents()
  const prefs = getPreferenceValues<Preferences>()

  const shouldShowMetaPanel = useMemo(() => prefs.anatomy || prefs.description || prefs.features, [prefs])

  return (
    <List searchBarPlaceholder="Search components..." isShowingDetail={shouldShowMetaPanel}>
      {components?.map((component) => (
        <List.Item
          key={component.name}
          title={component.name}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={component.docsUrl} />
              <Action.CopyToClipboard content={component.docsUrl} />
            </ActionPanel>
          }
          detail={shouldShowMetaPanel && <ComponentDetails component={component} />}
        />
      ))}
    </List>
  )
}
