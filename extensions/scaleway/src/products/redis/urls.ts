import type { Redisv1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getClusterUrl = (cluster: Redisv1.Cluster) =>
  `${CONSOLE_URL}/redis/clusters/${cluster.zone}/${cluster.id}/overview`
