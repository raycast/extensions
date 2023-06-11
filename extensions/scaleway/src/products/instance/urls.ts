import type { Instance } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getServerUrl = (server: Instance.v1.Server) =>
  `${CONSOLE_URL}/instance/servers/${server.zone}/${server.id}/overview`
