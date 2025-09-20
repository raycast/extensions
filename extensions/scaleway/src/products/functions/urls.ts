import type { Function } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getNamespaceUrl = (namespace: Function.v1beta1.Namespace) =>
  `${CONSOLE_URL}/functions/namespaces/${namespace.region}/${namespace.id}`

export const getFunctionUrl = (serverlessfunction: Function.v1beta1.Function) =>
  `${CONSOLE_URL}/functions/namespaces/${serverlessfunction.region}/${serverlessfunction.namespaceId}/functions/${serverlessfunction.id}/deployment`

export const getLoggingFunctionUrl = (serverlessfunction: Function.v1beta1.Function) =>
  `${CONSOLE_URL}/functions/namespaces/${serverlessfunction.region}/${serverlessfunction.namespaceId}/functions/${serverlessfunction.id}/logging`
