import { Color, Icon } from '@raycast/api'
import { AppleSilicon } from '@scaleway/sdk'

export const SERVER_STATUSES = AppleSilicon.v1alpha1.SERVER_TRANSIENT_STATUSES.reduce(
  (acc, transientStatus) => ({
    ...acc,
    [transientStatus]: {
      ...acc[transientStatus],
      source: Icon.CircleProgress100,
      tintColor: Color.Blue,
    },
  }),
  {
    unknown_status: { source: Icon.QuestionMarkCircle, tintColor: Color.Purple },
    starting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    ready: { source: Icon.CircleFilled, tintColor: Color.Green },
    error: { source: Icon.CircleFilled, tintColor: Color.Red },
    rebooting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    updating: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    locking: { source: Icon.Lock, tintColor: Color.Red },
    locked: { source: Icon.Lock, tintColor: Color.Red },
    unlocking: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    reinstalling: { source: Icon.CircleProgress100, tintColor: Color.Blue },
  }
)

export const getServerStatusIcon = (server: AppleSilicon.v1alpha1.Server) =>
  SERVER_STATUSES[server.status]

export const isServerTransient = (server?: AppleSilicon.v1alpha1.Server) =>
  server ? AppleSilicon.v1alpha1.SERVER_TRANSIENT_STATUSES.includes(server.status) : false
