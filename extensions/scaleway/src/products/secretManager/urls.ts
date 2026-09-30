import type { Secretv1beta1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getSecretUrl = (secret: Secretv1beta1.Secret) =>
  `${CONSOLE_URL}/secret-manager/secrets/${secret.region}/${secret.id}/overview`
