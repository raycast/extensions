import { Color, Icon } from '@raycast/api'
import { VPCGW } from '@scaleway/sdk'

export const GATEWAY_STATUSES = VPCGW.v1.GATEWAY_TRANSIENT_STATUSES.reduce(
  (acc, transientStatus) => ({
    ...acc,
    [transientStatus]: {
      ...acc[transientStatus],
      source: Icon.CircleProgress100,
      tintColor: Color.Blue,
    },
  }),
  {
    unknown: { source: Icon.QuestionMarkCircle, tintColor: Color.Purple },
    stopped: { source: Icon.CircleFilled, tintColor: Color.PrimaryText },
    allocating: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    configuring: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    running: { source: Icon.CircleFilled, tintColor: Color.Green },
    stopping: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    failed: { source: Icon.CircleFilled, tintColor: Color.Red },
    deleting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    deleted: { source: Icon.CircleFilled, tintColor: Color.Red },
    locked: { source: Icon.Lock, tintColor: Color.Red },
  }
)

export const getGatewayStatusIcon = (gateway: VPCGW.v1.Gateway) => GATEWAY_STATUSES[gateway.status]
