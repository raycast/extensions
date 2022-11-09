import { Database, DatabaseStatus } from '../types'

export const fakeDatabases: Database[] = [
  {
    id: '42a23742-5695-4210-bd7b-149ca4f0f36d',
    name: 'pg-customer-db',
    status: DatabaseStatus.READY,
    engine: 'PostgreSQL-13',
    region: 'fr-par',
    node_type: 'db-gp-s',
    tags: ['production', 'customers'],
    endpoints: [
      {
        ip: '98.76.54.32',
        port: '35253',
      },
    ],
    volume: {
      type: 'bssd',
      size: 500000000000,
    },
    read_replicas: [{ id: 'e2b38643-0ee0-4470-9e00-0e5a31fcb557' }],
    is_ha_cluster: true,
  },
]
