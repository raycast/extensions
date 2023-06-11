import type { LB } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getLoadBalancerUrl = (lb: LB.v1.Lb) =>
  `${CONSOLE_URL}/load-balancer/lbs/${lb.zone}/${lb.id}/overview`
