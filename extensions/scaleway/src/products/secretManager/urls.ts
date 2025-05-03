import type { Secret } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getSecretUrl = (secret: Secret.v1beta1.Secret) =>
  `${CONSOLE_URL}/secret-manager/secrets/${secret.region}/${secret.id}/overview`
