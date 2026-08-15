import { Color, Icon } from '@raycast/api'
import { Redisv1 } from '@scaleway/sdk'

export const CLUSTER_STATUSES = Redisv1.CLUSTER_TRANSIENT_STATUSES.reduce(
  (acc, transientStatus) => ({
    ...acc,
    [transientStatus]: {
      ...acc[transientStatus],
      source: Icon.CircleProgress100,
      tintColor: Color.Blue,
    },
  }),
  {
    autohealing: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    configuring: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    deleting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    error: { source: Icon.CircleFilled, tintColor: Color.Red },
    initializing: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    locked: { source: Icon.Lock, tintColor: Color.Red },
    provisioning: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    ready: { source: Icon.CircleFilled, tintColor: Color.Green },
    suspended: { source: Icon.CircleFilled, tintColor: Color.Red },
    unknown: { source: Icon.QuestionMarkCircle, tintColor: Color.Purple },
  }
)

export const getClusterStatusIcon = (cluster: Redisv1.Cluster) => CLUSTER_STATUSES[cluster.status]
export const isClusterTransient = (cluster?: Redisv1.Cluster) =>
  cluster ? Redisv1.CLUSTER_TRANSIENT_STATUSES.includes(cluster.status) : false
