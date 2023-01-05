import { Color, Icon } from '@raycast/api'
import { BareMetal } from '@scaleway/sdk'

export const SERVER_STATUSES = BareMetal.v1.SERVER_TRANSIENT_STATUSES.reduce(
  (acc, transientStatus) => ({
    ...acc,
    [transientStatus]: {
      ...acc[transientStatus],
      source: Icon.CircleProgress100,
      tintColor: Color.Blue,
    },
  }),
  {
    deleting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    delivering: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    error: { source: Icon.CircleFilled, tintColor: Color.Red },
    installing: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    locked: { source: Icon.Lock, tintColor: Color.Red },
    not_configured: { source: Icon.Circle, tintColor: Color.Blue },
    resetting: { source: Icon.CircleProgress100, tintColor: Color.Orange },
    completed: { source: Icon.Circle, tintColor: Color.Green },
    ordered: { source: Icon.Circle, tintColor: Color.Green },
    out_of_stock: { source: Icon.QuestionMarkCircle, tintColor: Color.Orange },
    ready: { source: Icon.CircleFilled, tintColor: Color.Green },
    rebooting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    rescue_mode: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    starting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    stopped: { source: Icon.CircleFilled, tintColor: Color.Red },
    stopping: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    to_install: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    unknown: { source: Icon.QuestionMarkCircle, tintColor: Color.Purple },
  }
)

export const getServerStatusIcon = (server: BareMetal.v1.Server) => SERVER_STATUSES[server.status]
