import type { Iamv1alpha1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../../constants'

export const getUsersUrl = () => `${CONSOLE_URL}/iam/users`

export const getUserUrl = (user: Iamv1alpha1.User) => `${getUsersUrl()}/${user.id}/overview`
