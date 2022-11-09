import { RedisCluster, RedisClusterStatus } from '../types'

export const fakeRedisClusters: RedisCluster[] = [
  {
    id: '4091ee4b-7362-4f5d-8ff6-fcb65ee0b703',
    name: 'auth-sessions',
    status: RedisClusterStatus.READY,
    version: '6.2.6',
    zone: 'fr-par-1',
    endpoints: [
      {
        port: 6379,
        ips: ['13.24.35.46'],
      },
    ],
    tags: ['web'],
    node_type: 'RED1-S',
    cluster_size: 2,
  },
  {
    id: 'cb853a3a-90b7-4b36-95e1-8e15ed6e52e9',
    name: 'bull-queue',
    status: RedisClusterStatus.ERROR,
    version: '6.2.6',
    zone: 'pl-waw-2',
    endpoints: [
      {
        port: 6379,
        ips: ['46.35.24.12'],
      },
    ],
    tags: [],
    node_type: 'RED1-XS',
    cluster_size: 1,
  },
]
