import { Color, Icon } from '@raycast/api'
import { RDB } from '@scaleway/sdk'

export const INSTANCE_STATUSES = RDB.v1.INSTANCE_TRANSIENT_STATUSES.reduce(
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
    backuping: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    configuring: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    deleting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    disk_full: { source: Icon.CircleFilled, tintColor: Color.Red },
    error: { source: Icon.CircleFilled, tintColor: Color.Red },
    initializing: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    locked: { source: Icon.Lock, tintColor: Color.Red },
    provisioning: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    ready: { source: Icon.CircleFilled, tintColor: Color.Green },
    restarting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    snapshotting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    unknown: { source: Icon.QuestionMarkCircle, tintColor: Color.Purple },
  }
)

export const getInstanceStatusIcon = (instance: RDB.v1.Instance) =>
  INSTANCE_STATUSES[instance.status]
