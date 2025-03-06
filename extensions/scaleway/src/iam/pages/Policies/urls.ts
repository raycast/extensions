import type { IAM } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../../constants'

export const getPoliciesUrl = () => `${CONSOLE_URL}/iam/policies`

export const getPolicyUrl = (policy: IAM.v1alpha1.Policy) =>
  `${getPoliciesUrl()}/${policy.id}/overview`
