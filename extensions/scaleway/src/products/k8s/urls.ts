import type { K8Sv1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getClusterUrl = (cluster: K8Sv1.Cluster) =>
  `${CONSOLE_URL}/kapsule/clusters/${cluster.region}/${cluster.id}/overview`
