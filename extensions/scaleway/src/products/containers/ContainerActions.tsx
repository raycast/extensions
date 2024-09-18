import { Action, ActionPanel, Icon } from '@raycast/api'
import type { Container } from '@scaleway/sdk'
import { useAPI } from 'helpers/useAPI'
import { deployContainer } from './actions'
// import { ContainerLogs } from './pages'
import { getContainerUrl } from './urls'

type ContainerActionProps = {
  container: Container.v1beta1.Container
  toggleIsDetailOpen: () => void
  reloadContainers: () => Promise<void>
}

export const ContainerActions = ({
  container,
  toggleIsDetailOpen,
  reloadContainers,
}: ContainerActionProps) => {
  const { containerV1Beta1 } = useAPI()

  return (
    <ActionPanel>
      <Action title="More Information" onAction={toggleIsDetailOpen} />
      <Action.OpenInBrowser url={getContainerUrl(container)} />
      <Action.CopyToClipboard content={getContainerUrl(container)} />

      {/* <Action.Push
        title="See Logs"
        icon={Icon.Terminal}
        shortcut={{ modifiers: ['cmd'], key: 'l' }}
        target={<ContainerLogs container={container} />}
      /> */}

      <Action
        title="Deploy Container"
        icon={Icon.Plus}
        shortcut={{ modifiers: ['cmd'], key: 'n' }}
        onAction={async () => {
          await deployContainer({
            container,
            containerV1Beta1,
            onSuccess: reloadContainers,
          })
        }}
      />
    </ActionPanel>
  )
}
