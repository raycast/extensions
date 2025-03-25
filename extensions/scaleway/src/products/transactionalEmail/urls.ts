import type { TransactionalEmail } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getDomainUrl = (domain: TransactionalEmail.v1alpha1.Domain) =>
  `${CONSOLE_URL}/transactional-email/domains/${domain.region}/${domain.id}/overview`
