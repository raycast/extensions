import type { Webhostingv1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getHostingUrl = (hosting: Webhostingv1.HostingSummary) =>
  `${CONSOLE_URL}/webhosting/webhostings/${hosting.region}/${hosting.id}/overview`
