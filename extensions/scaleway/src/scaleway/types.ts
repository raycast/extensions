/*
 * Only the properties that are used in the app are defined here.
 */
export enum ContainerStatus {
  UNKNOWN = 'unknown',
  READY = 'ready',
  DELETING = 'deleting',
  ERROR = 'error',
  LOCKED = 'locked',
  CREATING = 'creating',
  PENDING = 'pending',
}

export enum Privacy {
  PRIVATE = 'private',
  PUBLIC = 'public',
  UNKOWN_PRIVACY = 'unknown_privacy',
}

export interface Namespace {
  id: string
  name: string
  status: ContainerStatus
  description: string | null
  region: string
}

export interface Container {
  id: string
  name: string
  namespace_id: string
  status: ContainerStatus
  min_scale: number
  max_scale: number
  memory_limit: number
  cpu_limit: number
  privacy: Privacy
  description: string | null
  registry_image: string
  max_concurrency: number
  timeout: string
  error_message: string | null
  domain_name: string
  protocol: 'unknown_protocol'
  port: number
  region: string
}

export interface ContainerDomain {
  id: string
  hostname: string
  container_id: string
  url: string
}

export interface ContainerLog {
  id: string
  message: string
  timestamp: string
  level: string
  source: string
  stream: 'unknown' | 'stdout' | 'stderr'
}

export enum InstanceState {
  LOCKED = 'locked',
  RUNNING = 'running',
  STARTING = 'starting',
  STOPPED = 'stopped',
  STOPPED_IN_PLACE = 'stopped in place',
  STOPPING = 'stopping',
}

export interface Instance {
  id: string
  name: string
  arch: string
  commercial_type: string
  state: InstanceState
  zone: string
  image: {
    id: string
    name: string
  }
  tags: string[]
  public_ip: {
    address: string
  }
  security_group: {
    id: string
    name: string
  }
  allowed_actions: ('poweron' | 'poweroff' | 'reboot')[]
}

export enum DatabaseStatus {
  AUTOHEALING = 'autohealing',
  BACKUPING = 'backuping',
  CONFIGURING = 'configuring',
  DELETING = 'deleting',
  DISK_FULL = 'disk_full',
  ERROR = 'error',
  INITIALIZING = 'initializing',
  LOCKED = 'locked',
  PROVISIONING = 'provisioning',
  READY = 'ready',
  RESTARTING = 'restarting',
  SNAPSHOTTING = 'snapshotting',
  UNKNOWN = 'unknown',
}

export interface Database {
  id: string
  name: string
  status: DatabaseStatus
  engine: string
  region: string
  node_type: string
  tags: string[]
  endpoints: {
    ip: string
    port: string
  }[]
  volume: {
    type: 'lssd' | 'bssd'
    size: number
  }
  is_ha_cluster: boolean
  read_replicas: { id: string }[]
}

export enum RedisClusterStatus {
  AUTOHEALING = 'autohealing',
  CONFIGURING = 'configuring',
  DELETING = 'deleting',
  ERROR = 'error',
  INITIALIZING = 'initializing',
  LOCKED = 'locked',
  PROVISIONING = 'provisioning',
  READY = 'ready',
  SUSPENDED = 'suspended',
  UNKNOWN = 'unknown',
}

export interface RedisCluster {
  id: string
  name: string
  status: RedisClusterStatus
  version: string
  zone: string
  endpoints: {
    ips: string[]
    port: number
  }[]
  tags: string[]
  node_type: string
  cluster_size: number
}
