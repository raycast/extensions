import { Color, Icon } from '@raycast/api'
import { Registry } from '@scaleway/sdk'

export const NAMESPACES_STATUSES = Registry.v1.NAMESPACE_TRANSIENT_STATUSES.reduce(
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

export const IMAGES_STATUS = Registry.v1.IMAGE_TRANSIENT_STATUSES.reduce(
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

export const getNamespaceStatusIcon = (namespace: Registry.v1.Namespace) =>
  NAMESPACES_STATUSES[namespace.status]

export const getImageStatusIcon = (image: Registry.v1.Image) => IMAGES_STATUS[image.status]

export const isNamespaceTransient = (namespace?: Registry.v1.Namespace) =>
  namespace ? Registry.v1.NAMESPACE_TRANSIENT_STATUSES.includes(namespace.status) : false

export const isImageTransient = (image?: Registry.v1.Image) =>
  image ? Registry.v1.IMAGE_TRANSIENT_STATUSES.includes(image.status) : false
