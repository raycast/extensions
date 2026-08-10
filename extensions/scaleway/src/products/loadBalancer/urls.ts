import type { Lbv1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getLoadBalancerUrl = (lb: Lbv1.Lb) =>
  `${CONSOLE_URL}/load-balancer/lbs/${lb.zone}/${lb.id}/overview`
