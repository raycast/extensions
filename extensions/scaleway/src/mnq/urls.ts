import type { MNQ } from '@scaleway/sdk'
import { CONSOLE_URL } from '../constants'

export const getNamespaceUrl = (namespaces: MNQ.v1alpha1.Namespace) =>
  `${CONSOLE_URL}/messaging/namespaces/${namespaces.region}/${namespaces.id}/overview`
