import type { Domainv2beta1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

const getInternalDomainUrl = (domain: Domainv2beta1.DomainSummary) =>
  `${CONSOLE_URL}/domains/internal/global/${domain.domain}/overview`

const getExternalDomainUrl = (domain: Domainv2beta1.DomainSummary) =>
  `${CONSOLE_URL}/domains/external/global/${domain.domain}/overview`

export const getDomainUrl = (domain: Domainv2beta1.DomainSummary) => {
  if (domain.isExternal) {
    return getExternalDomainUrl(domain)
  }

  return getInternalDomainUrl(domain)
}
