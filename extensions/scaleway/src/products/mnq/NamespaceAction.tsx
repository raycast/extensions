import { Action, ActionPanel } from '@raycast/api'
import type { MNQ } from '@scaleway/sdk'
import { getNamespaceUrl } from './urls'

type NamespaceActionProps = {
  namespace: MNQ.v1alpha1.Namespace
  toggleIsDetailOpen: () => void
}

export const NamespaceAction = ({ namespace, toggleIsDetailOpen }: NamespaceActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getNamespaceUrl(namespace)} />
    <Action.CopyToClipboard content={getNamespaceUrl(namespace)} />
  </ActionPanel>
)
