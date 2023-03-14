import type { AppleSilicon } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getServerUrl = (server: AppleSilicon.v1alpha1.Server) =>
  `${CONSOLE_URL}/asaas/servers/${server.zone}/${server.id}/overview`
