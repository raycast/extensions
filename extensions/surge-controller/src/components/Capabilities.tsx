import actionBoundary from '../utils/actionBoundary'
import useRequire from '../hooks/useRequire'
import ErrorBoundary from './ErrorBoundary'
import { ActionPanel, List, showToast, Action, Toast } from '@raycast/api'
import { getCapabilityList, switchCapability } from '../api'
import { IconIsSelected } from '../utils'
import { CapabilityListT } from '../utils/types'

const Capabilities = () => {
  const {
    response: capabilityList,
    setResponse: setCapabilityList,
    error,
    loading,
    setError,
  } = useRequire<CapabilityListT>({
    apiLoader: getCapabilityList,
    defaultData: [],
  })

  const handleAction = actionBoundary(async (title: string, status: boolean, i: number) => {
    await switchCapability(i, !status)
    capabilityList[i].status = !status
    setCapabilityList([...capabilityList])
    await showToast(
      Toast.Style.Success,
      'Success',
      `${title} has been ${status === true ? 'disabled' : 'enabled'}.`,
    )
  }, setError)

  return (
    <List isLoading={loading} navigationTitle="Capabilities">
      <ErrorBoundary error={error}>
        {capabilityList.map(({ title, status }, i) => (
          <List.Item
            key={title}
            title={title}
            icon={IconIsSelected(status)}
            actions={
              <ActionPanel>
                <Action title="Switch" onAction={() => handleAction(title, status, i)} />
              </ActionPanel>
            }
          />
        ))}
      </ErrorBoundary>
    </List>
  )
}

export default Capabilities
