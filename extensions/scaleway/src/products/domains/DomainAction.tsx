import { Action, ActionPanel } from '@raycast/api'
import type { Domainv2beta1 } from '@scaleway/sdk'
import { getDomainUrl } from './urls'

type DomainActionProps = {
  domain: Domainv2beta1.DomainSummary
  toggleIsDetailOpen: () => void
}

export const DomainAction = ({ domain, toggleIsDetailOpen }: DomainActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getDomainUrl(domain)} />
    <Action.CopyToClipboard content={getDomainUrl(domain)} />
  </ActionPanel>
)
