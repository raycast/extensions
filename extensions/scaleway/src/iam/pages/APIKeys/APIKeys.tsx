import { Action, ActionPanel, List } from '@raycast/api'
import type { IAM } from '@scaleway/sdk'
import { useReducer, useState } from 'react'
import { useAllApiKeysQuery } from '../../queries'
import { APIkey, DropDownOrderBy } from './components'

export const APIkeys = () => {
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, false)

  const [orderBy, setOrderBy] = useState<IAM.v1alpha1.ListAPIKeysRequestOrderBy>('access_key_asc')

  const { data: apiKeys = [], isLoading } = useAllApiKeysQuery({
    orderBy,
  })

  const isListLoading = isLoading && !apiKeys

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search API Keys …"
      searchBarAccessory={
        <DropDownOrderBy
          setOrderBy={(str) => setOrderBy(str as IAM.v1alpha1.ListAPIKeysRequestOrderBy)}
        />
      }
    >
      {apiKeys.map((apiKey) => (
        <List.Item
          key={apiKey.accessKey}
          title={apiKey.accessKey}
          subtitle={apiKey.description}
          detail={<APIkey apiKey={apiKey} />}
          actions={
            <ActionPanel>
              <Action title="More Information" onAction={toggleIsDetailOpen} />
            </ActionPanel>
          }
        />
      ))}

      <List.EmptyView title="No API Keys found" />
    </List>
  )
}
