import type { Container } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getNamespaceUrl = (namespace: Container.v1beta1.Namespace) =>
  `${CONSOLE_URL}/containers/namespaces/${namespace.region}/${namespace.id}`

export const getContainerUrl = (container: Container.v1beta1.Container) =>
  `${CONSOLE_URL}/containers/namespaces/${container.region}/${container.namespaceId}/containers/${container.id}/deployment`

export const getLoggingContainerUrl = (container: Container.v1beta1.Container) =>
  `${CONSOLE_URL}/containers/namespaces/${container.region}/${container.namespaceId}/containers/${container.id}/logging`
