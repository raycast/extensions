import { Color, Icon } from '@raycast/api'
import { K8S } from '@scaleway/sdk'

export const CLUSTERS_STATUSES = K8S.v1.CLUSTER_TRANSIENT_STATUSES.reduce(
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

export const getClusterStatusIcon = (cluster: K8S.v1.Cluster) => CLUSTERS_STATUSES[cluster.status]

export const isClusterTransient = (cluster?: K8S.v1.Cluster) =>
  cluster ? K8S.v1.CLUSTER_TRANSIENT_STATUSES.includes(cluster.status) : false
