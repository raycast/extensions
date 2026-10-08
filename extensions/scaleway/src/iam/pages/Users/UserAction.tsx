import { Action, ActionPanel } from '@raycast/api'
import type { Iamv1alpha1 } from '@scaleway/sdk'
import { getUserUrl } from './urls'

type UserActionProps = {
  user: Iamv1alpha1.User
  toggleIsDetailOpen: () => void
}

export const UserAction = ({ user, toggleIsDetailOpen }: UserActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getUserUrl(user)} />
    <Action.CopyToClipboard content={getUserUrl(user)} />
  </ActionPanel>
)
