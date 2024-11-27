import { Action, ActionPanel } from '@raycast/api'
import type { RDB } from '@scaleway/sdk'
import { getDatabaseInstanceUrl } from './urls'

type InstanceActionProps = {
  instance: RDB.v1.Instance
  toggleIsDetailOpen: () => void
}

export const InstanceAction = ({ instance, toggleIsDetailOpen }: InstanceActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getDatabaseInstanceUrl(instance)} />
    <Action.CopyToClipboard content={getDatabaseInstanceUrl(instance)} />
  </ActionPanel>
)
