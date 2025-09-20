import { Action, ActionPanel } from '@raycast/api'
import type { Webhosting } from '@scaleway/sdk'
import { getHostingUrl } from './urls'

type HostingActionProps = {
  hosting: Webhosting.v1alpha1.Hosting
  toggleIsDetailOpen: () => void
}

export const HostingAction = ({ hosting, toggleIsDetailOpen }: HostingActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getHostingUrl(hosting)} />
    <Action.CopyToClipboard content={getHostingUrl(hosting)} />
  </ActionPanel>
)
