import { Color, Icon } from '@raycast/api'
import { IOT } from '@scaleway/sdk'

export const HUB_STATUSES = IOT.v1.HUB_TRANSIENT_STATUSES.reduce(
  (acc, transientStatus) => ({
    ...acc,
    [transientStatus]: {
      ...acc[transientStatus],
      source: Icon.CircleProgress100,
      tintColor: Color.Blue,
    },
  }),
  {
    disabled: { source: Icon.CircleFilled, tintColor: Color.PrimaryText },
    error: { source: Icon.CircleFilled, tintColor: Color.Red },
    unknown: { source: Icon.QuestionMarkCircle, tintColor: Color.Purple },
    ready: { source: Icon.CircleFilled, tintColor: Color.Green },
    enabling: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    disabling: { source: Icon.CircleProgress100, tintColor: Color.Blue },
  }
)

export const getHubStatusIcon = (hub: IOT.v1.Hub) => HUB_STATUSES[hub.status]
