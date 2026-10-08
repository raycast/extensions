import { Action, ActionPanel } from '@raycast/api'
import type { Registryv1 } from '@scaleway/sdk'
import { getNamespaceUrl } from './urls'

type NamespaceActionProps = {
  namespace: Registryv1.Namespace
  toggleIsDetailOpen: () => void
}

export const NamespaceAction = ({ namespace, toggleIsDetailOpen }: NamespaceActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getNamespaceUrl(namespace)} />
    <Action.CopyToClipboard content={getNamespaceUrl(namespace)} />
  </ActionPanel>
)
