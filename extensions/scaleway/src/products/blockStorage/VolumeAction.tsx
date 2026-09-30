import { Action, ActionPanel } from '@raycast/api'
import { getVolumeUrl } from './urls'

type VolumeActionProps = {
  toggleIsDetailOpen: () => void
}

export const VolumeAction = ({ toggleIsDetailOpen }: VolumeActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getVolumeUrl()} />
    <Action.CopyToClipboard content={getVolumeUrl()} />
  </ActionPanel>
)
