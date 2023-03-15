import type { BareMetal } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getServerUrl = (server: BareMetal.v1.Server) =>
  `${CONSOLE_URL}/elastic-metal/servers/${server.zone}/${server.id}/overview`
