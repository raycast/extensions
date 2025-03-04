import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { useReducer, useState } from 'react'
import { POLLING_INTERVAL } from '../../constants'
import { FunctionActions } from './FunctionActions'
import { FunctionDetail } from './FunctionDetail'
import { FunctionDropdown } from './FunctionDropdown'
import { useAllFunctionsQuery, useAllRegionsNamespacesQuery } from './queries'
import { getFunctionStatusIcon, isFunctionTransient } from './status'

export const Functions = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)
  const [selectedNamespaceId, setSelectedNamespaceId] = useState<string>('')

  const { data: namespaces } = useAllRegionsNamespacesQuery({
    orderBy: 'created_at_asc',
    organizationId: clientSetting.defaultOrganizationId,
  })

  const {
    data: functions,
    isLoading,
    reload: reloadFunctions,
  } = useAllFunctionsQuery(
    {
      namespaceId: selectedNamespaceId,
      organizationId: clientSetting.defaultOrganizationId,
      region: (namespaces || []).find(({ id }) => id === selectedNamespaceId)?.region,
    },
    {
      enabled: selectedNamespaceId !== '',
      pollingInterval: POLLING_INTERVAL['10S'],
      needPolling: (data) => (data || []).some(isFunctionTransient),
    }
  )

  const isListLoading = isLoading && !namespaces && !functions

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Functions …"
      searchBarAccessory={
        <FunctionDropdown setSelectedNamespaceId={setSelectedNamespaceId} namespaces={namespaces} />
      }
    >
      {(functions || []).map((serverlessFunction) => (
        <List.Item
          key={serverlessFunction.id}
          title={serverlessFunction.name}
          icon={{
            source: {
              dark: 'icons/serverless-functions@dark.svg',
              light: 'icons/serverless-functions@light.svg',
            },
          }}
          detail={
            <FunctionDetail serverlessFunction={serverlessFunction} namespaces={namespaces} />
          }
          accessories={[
            {
              tooltip: serverlessFunction.status,
              icon: getFunctionStatusIcon(serverlessFunction),
            },
          ]}
          actions={
            <FunctionActions
              serverlessFunction={serverlessFunction}
              toggleIsDetailOpen={toggleIsDetailOpen}
              reloadContainers={reloadFunctions}
            />
          }
        />
      ))}

      <List.EmptyView title="No Functions found" />
    </List>
  )
}
