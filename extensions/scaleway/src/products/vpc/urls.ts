import type { Vpcv2 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getPrivateNetworkUrl = (privateNetwork: Vpcv2.PrivateNetwork) =>
  `${CONSOLE_URL}/private-network/private-networks/${privateNetwork.region}/${privateNetwork.id}/overview`
