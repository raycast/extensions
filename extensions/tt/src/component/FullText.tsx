import React, { FunctionComponent, useMemo } from 'react'
import { Action, ActionPanel, Detail } from '@raycast/api'
import { L } from '../constant'
import { TranslateListItemData } from '../service/type'

export const FullText: FunctionComponent<Props> = (props) => {
  const { source, item } = props
  const markdown = useMemo(() => [source, item.text].join('\n\n---\n\n'), [])

  return (
    <Detail
      markdown={markdown}
      navigationTitle={item.service}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title={L.Copy}
              content={item.text}
              shortcut={{ modifiers: ['cmd'], key: '.' }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )
}

type Props = {
  source: string
  item: TranslateListItemData
}