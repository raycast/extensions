import { Color, Icon } from '@raycast/api'
import { LB } from '@scaleway/sdk'

export const LOAD_BALANCER_STATUSES = LB.v1.LB_TRANSIENT_STATUSES.reduce(
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
    deleting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    error: { source: Icon.CircleFilled, tintColor: Color.Red },
    locked: { source: Icon.Lock, tintColor: Color.Red },
    migrating: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    pending: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    ready: { source: Icon.CircleFilled, tintColor: Color.Green },
    stopped: { source: Icon.CircleFilled, tintColor: Color.PrimaryText },
    to_create: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    to_delete: { source: Icon.CircleFilled, tintColor: Color.Red },
    unknown: { source: Icon.QuestionMarkCircle, tintColor: Color.Purple },
  }
)

export const getLoadBalancerStatusIcon = (lb: LB.v1.Lb) => LOAD_BALANCER_STATUSES[lb.status]
