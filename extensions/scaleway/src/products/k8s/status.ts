import { Color, Icon } from '@raycast/api'
import { K8Sv1 } from '@scaleway/sdk'

export const CLUSTERS_STATUSES = K8Sv1.CLUSTER_TRANSIENT_STATUSES.reduce(
  (acc, transientStatus) => ({
    ...acc,
    [transientStatus]: {
      ...acc[transientStatus],
      source: Icon.CircleProgress100,
      tintColor: Color.Blue,
    },
  }),
  {
    creating: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    deleted: { source: Icon.CircleFilled, tintColor: Color.Red },
    deleting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    locked: { source: Icon.Lock, tintColor: Color.Red },
    pool_required: { source: Icon.CircleFilled, tintColor: Color.Red },
    ready: { source: Icon.CircleFilled, tintColor: Color.Green },
    unknown: { source: Icon.QuestionMarkCircle, tintColor: Color.Purple },
    updating: { source: Icon.CircleProgress100, tintColor: Color.Blue },
  }
)

export const getClusterStatusIcon = (cluster: K8Sv1.Cluster) => CLUSTERS_STATUSES[cluster.status]

export const isClusterTransient = (cluster?: K8Sv1.Cluster) =>
  cluster ? K8Sv1.CLUSTER_TRANSIENT_STATUSES.includes(cluster.status) : false
