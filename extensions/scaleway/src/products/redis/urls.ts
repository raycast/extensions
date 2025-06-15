import type { Redis } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getClusterUrl = (cluster: Redis.v1.Cluster) =>
  `${CONSOLE_URL}/redis/clusters/${cluster.zone}/${cluster.id}/overview`
