import actionBoundary from '../utils/actionBoundary'
import useRequire from '../hooks/useRequire'
import ErrorBoundary from './ErrorBoundary'
import { ActionPanel, List, showToast, Action, Toast } from '@raycast/api'
import { getModules, switchModule } from '../api'
import { IconIsSelected } from '../utils'
import { ModuleListT } from '../utils/types'

const Modules = () => {
  const {
    response: moduleList,
    setResponse: setModuleList,
    error,
    loading,
    setError,
  } = useRequire<ModuleListT>({
    apiLoader: getModules,
    defaultData: [],
  })

  const handleAction = actionBoundary(async (name: string, status: boolean, index: number) => {
    await switchModule({ [name]: !status })
    moduleList[index].status = !status
    setModuleList([...moduleList])
    await showToast(
      Toast.Style.Success,
      'Success',
      `${name} has been ${status === true ? 'disabled' : 'enabled'}.`,
    )
  }, setError)

  return (
    <List isLoading={loading} navigationTitle="Modules">
      <ErrorBoundary error={error}>
        {moduleList.map(({ name, status }, index) => (
          <List.Item
            title={name}
            key={name}
            icon={IconIsSelected(status)}
            actions={
              <ActionPanel>
                <Action title="Switch" onAction={() => handleAction(name, status, index)} />
              </ActionPanel>
            }
          />
        ))}
      </ErrorBoundary>
    </List>
  )
}

export default Modules
