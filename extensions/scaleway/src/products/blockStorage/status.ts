import { Color, Icon } from '@raycast/api'
import { Block } from '@scaleway/sdk'

export const VOLUME_STATUSES = Block.v1alpha1.VOLUME_TRANSIENT_STATUSES.reduce(
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
    creating: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    available: { source: Icon.CircleFilled, tintColor: Color.Green },
    in_use: { source: Icon.CircleFilled, tintColor: Color.Green },
    error: { source: Icon.CircleFilled, tintColor: Color.Red },
    deleting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    snapshotting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    resizing: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    locked: { source: Icon.Lock, tintColor: Color.Red },
    deleted: { source: Icon.CircleFilled, tintColor: Color.Green },
  }
)

export const getVolumeStatusIcon = (volume: Block.v1alpha1.Volume) => VOLUME_STATUSES[volume.status]

export const isVolumeTransient = (volume?: Block.v1alpha1.Volume) =>
  volume ? Block.v1alpha1.VOLUME_TRANSIENT_STATUSES.includes(volume.status) : false
