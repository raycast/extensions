import type { VPCGW } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getGatewayUrl = (gateway: VPCGW.v1.Gateway) =>
  `${CONSOLE_URL}/public-gateway/public-gateways/${gateway.zone}/${gateway.id}/overview`
