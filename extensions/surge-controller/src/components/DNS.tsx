import actionBoundary from '../utils/actionBoundary'
import useRequire from '../hooks/useRequire'
import ErrorBoundary from './ErrorBoundary'
import { ActionPanel, Action, List, showToast, Toast, useNavigation } from '@raycast/api'
import { getDNS, flushDnsCache } from '../api'
import { DNSListT } from '../utils/types'

const DNS = () => {
  const { pop } = useNavigation()
  const {
    response: dnsList,
    error,
    loading,
    setError,
  } = useRequire<DNSListT>({
    apiLoader: getDNS,
    defaultData: [],
  })

  const onActionHandle = actionBoundary(async () => {
    await flushDnsCache()
    await showToast(Toast.Style.Success, 'Success', 'The DNS cache has been flushed.')
    pop()
  }, setError)

  return (
    <List isLoading={loading} isShowingDetail navigationTitle="dns">
      <ErrorBoundary error={error}>
        {dnsList.map(({ domain, data, server, path, expiresTime }) => (
          <List.Item
            key={expiresTime}
            title={domain}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Query IP Details" url={`https://ip.sb/ip/${data[0]}`} />
                <ActionPanel.Submenu title="Flush DNS" shortcut={{ modifiers: ['cmd'], key: 'r' }}>
                  <Action title="Yes" onAction={() => onActionHandle()} />
                  <Action title="No" />
                </ActionPanel.Submenu>
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={`
### Server: ${server}
### Result:
- ${data.join(' \n- ')}
### Path:
- ${path.split('->').join('->\n- ')}
`}
              />
            }
          />
        ))}
      </ErrorBoundary>
    </List>
  )
}

export default DNS
