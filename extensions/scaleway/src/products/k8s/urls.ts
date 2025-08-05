import type { K8S } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getClusterUrl = (cluster: K8S.v1.Cluster) =>
  `${CONSOLE_URL}/kapsule/clusters/${cluster.region}/${cluster.id}/overview`
