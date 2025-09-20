import type { RDB } from '@scaleway/sdk'
import { CONSOLE_URL } from '../../constants'

export const getDatabaseInstanceUrl = (instance: RDB.v1.Instance) =>
  `${CONSOLE_URL}/rdb/instances/${instance.region}/${instance.id}/overview`
