import type { IOT } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getHubUrl = (hub: IOT.v1.Hub) =>
  `${CONSOLE_URL}/iot-hub/hubs/${hub.region}/${hub.id}/overview`
