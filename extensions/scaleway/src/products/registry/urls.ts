import type { Registry } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getNamespaceUrl = (namespace: Registry.v1.Namespace) =>
  `${CONSOLE_URL}/registry/namespaces/${namespace.region}/${namespace.id}`

export const getImageUrl = ({
  namespace,
  image,
}: {
  namespace: Registry.v1.Namespace
  image: Registry.v1.Image
}) => `${getNamespaceUrl(namespace)}/images/${image.id}`
