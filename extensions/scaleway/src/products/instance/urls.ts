import type { Instancev1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getServerUrl = (server: Instancev1.Server) =>
  `${CONSOLE_URL}/instance/servers/${server.zone}/${server.id}/overview`
