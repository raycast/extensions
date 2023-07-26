import { Color, Icon } from '@raycast/api'
import { Instance } from '@scaleway/sdk'

export const SERVER_STATUSES = Instance.v1.SERVER_TRANSIENT_STATUSES.reduce(
  (acc, transientStatus) => ({
    ...acc,
    [transientStatus]: {
      ...acc[transientStatus],
      source: Icon.CircleProgress100,
      tintColor: Color.Blue,
    },
  }),
  {
    'running': { source: Icon.CircleFilled, tintColor: Color.Green },
    'stopped': { source: Icon.CircleFilled, tintColor: Color.PrimaryText },
    'stopped in place': { source: Icon.CircleFilled, tintColor: Color.PrimaryText },
    'starting': { source: Icon.CircleProgress100, tintColor: Color.Blue },
    'stopping': { source: Icon.CircleProgress100, tintColor: Color.Blue },
    'locked': { source: Icon.Lock, tintColor: Color.Red },
    'maintenance': { source: Icon.CircleFilled, tintColor: Color.Orange },
    'empty': { source: Icon.CircleFilled, tintColor: Color.PrimaryText },
  }
)

export const getServerStatusIcon = (server: Instance.v1.Server) => SERVER_STATUSES[server.state]

export const isServerTransient = (server?: Instance.v1.Server) =>
  server ? Instance.v1.SERVER_TRANSIENT_STATUSES.includes(server.state) : false
