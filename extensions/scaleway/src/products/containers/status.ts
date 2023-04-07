import { Color, Icon } from '@raycast/api'
import { Container } from '@scaleway/sdk'

export const CONTAINER_STATUSES = Container.v1beta1.CONTAINER_TRANSIENT_STATUSES.reduce(
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
    creating: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    created: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    ready: { source: Icon.CircleFilled, tintColor: Color.Green },
    deleting: { source: Icon.CircleProgress100, tintColor: Color.Blue },
    error: { source: Icon.CircleFilled, tintColor: Color.Red },
    locked: { source: Icon.Lock, tintColor: Color.Red },
    pending: { source: Icon.CircleProgress100, tintColor: Color.Blue },
  }
)

export const getContainerStatusIcon = (container: Container.v1beta1.Container) =>
  CONTAINER_STATUSES[container.status]

export const isContainerTransient = (container?: Container.v1beta1.Container) =>
  container ? Container.v1beta1.CONTAINER_TRANSIENT_STATUSES.includes(container.status) : false
