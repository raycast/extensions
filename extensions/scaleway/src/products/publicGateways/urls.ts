import type { Vpcgwv1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getGatewayUrl = (gateway: Vpcgwv1.Gateway) =>
  `${CONSOLE_URL}/public-gateway/public-gateways/${gateway.zone}/${gateway.id}/overview`
