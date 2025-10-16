import { Action, ActionPanel } from '@raycast/api'
import type { IAM } from '@scaleway/sdk'
import { getUserUrl } from './urls'

type UserActionProps = {
  user: IAM.v1alpha1.User
  toggleIsDetailOpen: () => void
}

export const UserAction = ({ user, toggleIsDetailOpen }: UserActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getUserUrl(user)} />
    <Action.CopyToClipboard content={getUserUrl(user)} />
  </ActionPanel>
)
