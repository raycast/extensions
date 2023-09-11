import type { IAM } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../../constants'

export const getUsersUrl = () => `${CONSOLE_URL}/iam/users`

export const getUserUrl = (user: IAM.v1alpha1.User) => `${getUsersUrl()}/${user.id}/overview`
