import { Color, Icon } from '@raycast/api'
import { Webhosting } from '@scaleway/sdk'

export const HOSTING_STATUSES = Webhosting.v1alpha1.HOSTING_TRANSIENT_STATUSES.reduce(
  (acc, transientStatus) => ({
    ...acc,
    [transientStatus]: {
      ...acc[transientStatus],
      source: Icon.CircleProgress100,
      tintColor: Color.Blue,
    },
  }),
  {
    delivering: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    migrating: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    deleting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    error: { source: Icon.CircleFilled, tintColor: Color.Red },
    locked: { source: Icon.Lock, tintColor: Color.Red },
    ready: { source: Icon.CircleFilled, tintColor: Color.Green },
    unknown_status: { source: Icon.QuestionMarkCircle, tintColor: Color.Purple },
  }
)

export const getHostingStatusIcon = (hosting: Webhosting.v1alpha1.Hosting) =>
  HOSTING_STATUSES[hosting.status]
export const isHostingTransient = (hosting?: Webhosting.v1alpha1.Hosting) =>
  hosting ? Webhosting.v1alpha1.HOSTING_TRANSIENT_STATUSES.includes(hosting.status) : false
