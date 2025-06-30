import type { VPC } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getPrivateNetworkUrl = (privateNetwork: VPC.v2.PrivateNetwork) =>
  `${CONSOLE_URL}/private-network/private-networks/${privateNetwork.region}/${privateNetwork.id}/overview`
