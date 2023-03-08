import { Action, ActionPanel, List } from '@raycast/api'
import type { IAM } from '@scaleway/sdk'
import { useReducer, useState } from 'react'
import { useAllPoliciesQuery } from '../../queries'
import { DropDownOrderBy, Policy } from './components'

export const Policies = () => {
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, false)

  const [orderBy, setOrderBy] = useState<IAM.v1alpha1.ListPoliciesRequestOrderBy>('policy_name_asc')

  const { data: policies = [], isLoading } = useAllPoliciesQuery({
    orderBy,
  })

  const isListLoading = isLoading && !policies

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Policies Keys …"
      searchBarAccessory={
        <DropDownOrderBy
          setOrderBy={(str) => setOrderBy(str as IAM.v1alpha1.ListPoliciesRequestOrderBy)}
        />
      }
    >
      {policies.map((policy) => (
        <List.Item
          key={policy.id}
          title={policy.name}
          subtitle={policy.description}
          icon={{
            source: {
              dark: 'iam-policy@dark.svg',
              light: 'iam-policy@light.svg',
            },
          }}
          detail={<Policy policy={policy} />}
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
