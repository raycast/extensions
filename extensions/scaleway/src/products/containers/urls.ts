import type { Containerv1beta1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getNamespaceUrl = (namespace: Containerv1beta1.Namespace) =>
  `${CONSOLE_URL}/containers/namespaces/${namespace.region}/${namespace.id}`

export const getContainerUrl = (container: Containerv1beta1.Container) =>
  `${CONSOLE_URL}/containers/namespaces/${container.region}/${container.namespaceId}/containers/${container.id}/deployment`

export const getLoggingContainerUrl = (container: Containerv1beta1.Container) =>
  `${CONSOLE_URL}/containers/namespaces/${container.region}/${container.namespaceId}/containers/${container.id}/logging`
