import type { Baremetalv1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getServerUrl = (server: Baremetalv1.Server) =>
  `${CONSOLE_URL}/elastic-metal/servers/${server.zone}/${server.id}/overview`
