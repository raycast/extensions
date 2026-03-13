import type { Iamv1alpha1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../../constants'

export const getPoliciesUrl = () => `${CONSOLE_URL}/iam/policies`

export const getPolicyUrl = (policy: Iamv1alpha1.Policy) =>
  `${getPoliciesUrl()}/${policy.id}/overview`
