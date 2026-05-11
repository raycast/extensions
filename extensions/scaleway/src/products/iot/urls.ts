import type { Iotv1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getHubUrl = (hub: Iotv1.Hub) =>
  `${CONSOLE_URL}/iot-hub/hubs/${hub.region}/${hub.id}/overview`
