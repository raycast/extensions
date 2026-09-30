import type { Applesiliconv1alpha1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getServerUrl = (server: Applesiliconv1alpha1.Server) =>
  `${CONSOLE_URL}/asaas/servers/${server.zone}/${server.id}/overview`
