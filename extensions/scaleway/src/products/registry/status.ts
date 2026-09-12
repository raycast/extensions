import { Color, Icon } from '@raycast/api'
import { Registryv1 } from '@scaleway/sdk'

export const NAMESPACES_STATUSES = Registryv1.NAMESPACE_TRANSIENT_STATUSES.reduce(
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

export const IMAGES_STATUS = Registryv1.IMAGE_TRANSIENT_STATUSES.reduce(
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

export const getNamespaceStatusIcon = (namespace: Registryv1.Namespace) =>
  NAMESPACES_STATUSES[namespace.status]

export const getImageStatusIcon = (image: Registryv1.Image) => IMAGES_STATUS[image.status]

export const isNamespaceTransient = (namespace?: Registryv1.Namespace) =>
  namespace ? Registryv1.NAMESPACE_TRANSIENT_STATUSES.includes(namespace.status) : false

export const isImageTransient = (image?: Registryv1.Image) =>
  image ? Registryv1.IMAGE_TRANSIENT_STATUSES.includes(image.status) : false
