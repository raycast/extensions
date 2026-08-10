import type { Registryv1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getNamespaceUrl = (namespace: Registryv1.Namespace) =>
  `${CONSOLE_URL}/registry/namespaces/${namespace.region}/${namespace.id}`

export const getImageUrl = ({
  namespace,
  image,
}: {
  namespace: Registryv1.Namespace
  image: Registryv1.Image
}) => `${getNamespaceUrl(namespace)}/images/${image.id}`
