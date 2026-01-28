import type { Rdbv1 } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getDatabaseInstanceUrl = (instance: Rdbv1.Instance) =>
  `${CONSOLE_URL}/rdb/instances/${instance.region}/${instance.id}/overview`
