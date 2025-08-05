import { Action, ActionPanel, Icon } from '@raycast/api'
import type { Function } from '@scaleway/sdk'
import { useAPI } from 'helpers/useAPI'
import { deployFunction } from './actions'
// import { FunctionLogs } from './pages'
import { getFunctionUrl } from './urls'

type FunctionActionsProps = {
  serverlessFunction: Function.v1beta1.Function
  toggleIsDetailOpen: () => void
  reloadContainers: () => Promise<void>
}

export const FunctionActions = ({
  serverlessFunction,
  toggleIsDetailOpen,
  reloadContainers,
}: FunctionActionsProps) => {
  const { functionV1beta1 } = useAPI()

  return (
    <ActionPanel>
      <Action title="More Information" onAction={toggleIsDetailOpen} />
      <Action.OpenInBrowser url={getFunctionUrl(serverlessFunction)} />
      <Action.CopyToClipboard content={getFunctionUrl(serverlessFunction)} />

      {/* <Action.Push
        title="See Logs"
        icon={Icon.Terminal}
        shortcut={{ modifiers: ['cmd'], key: 'l' }}
        target={<FunctionLogs serverlessFunction={serverlessFunction} />}
      /> */}

      <Action
        title="Deploy Function"
        icon={Icon.Plus}
        shortcut={{ modifiers: ['cmd'], key: 'n' }}
        onAction={async () => {
          await deployFunction({
            serverlessFunction,
            functionV1beta1,
            onSuccess: reloadContainers,
          })
        }}
      />
    </ActionPanel>
  )
}
