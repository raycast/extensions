import { Action, ActionPanel } from '@raycast/api'
import type { TransactionalEmail } from '@scaleway/sdk'
import { getDomainUrl } from './urls'

type DomainActionProps = {
  domain: TransactionalEmail.v1alpha1.Domain
  toggleIsDetailOpen: () => void
}

export const DomainAction = ({ domain, toggleIsDetailOpen }: DomainActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getDomainUrl(domain)} />
    <Action.CopyToClipboard content={getDomainUrl(domain)} />
  </ActionPanel>
)
