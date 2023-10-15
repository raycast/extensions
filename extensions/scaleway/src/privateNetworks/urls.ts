import type { VPC } from '@scaleway/sdk'
import { CONSOLE_URL } from '../constants'

export const getPrivateNetworkUrl = (privateNetwork: VPC.v1.PrivateNetwork) =>
  `${CONSOLE_URL}/private-network/private-networks/${privateNetwork.zone}/${privateNetwork.id}/overview`
