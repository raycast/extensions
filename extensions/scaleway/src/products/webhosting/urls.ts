import type { Webhosting } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getHostingUrl = (hosting: Webhosting.v1alpha1.Hosting) =>
  `${CONSOLE_URL}/webhosting/webhostings/${hosting.region}/${hosting.id}/overview`
