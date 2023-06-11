import { Action, ActionPanel } from '@raycast/api'
import type { Domain } from '@scaleway/sdk'
import { getDomainUrl } from './urls'

type DomainActionProps = {
  domain: Domain.v2beta1.DomainSummary
  toggleIsDetailOpen: () => void
}

export const DomainAction = ({ domain, toggleIsDetailOpen }: DomainActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getDomainUrl(domain)} />
    <Action.CopyToClipboard content={getDomainUrl(domain)} />
  </ActionPanel>
)
