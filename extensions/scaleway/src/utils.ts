import { Color, Icon } from '@raycast/api'
import {
  Container,
  ContainerStatus,
  DatabaseStatus,
  InstanceState,
  Privacy,
  RedisClusterStatus,
} from './scaleway/types'

export function getContainerStatusIcon(status: ContainerStatus) {
  let icon: { source: Icon; tintColor?: Color }

  switch (status) {
    case ContainerStatus.UNKNOWN:
      icon = { source: Icon.QuestionMarkCircle }
      break
    case ContainerStatus.DELETING:
      icon = { source: Icon.Stop, tintColor: Color.Red }
      break
    case ContainerStatus.ERROR:
      icon = { source: Icon.CircleProgress100, tintColor: Color.Red }
      break
    case ContainerStatus.LOCKED:
      icon = { source: Icon.Lock, tintColor: Color.Green }
      break
    case ContainerStatus.CREATING:
      icon = { source: Icon.CircleProgress25, tintColor: Color.Green }
      break
    case ContainerStatus.PENDING:
      icon = { source: Icon.CircleProgress100, tintColor: Color.Blue }
      break
    case ContainerStatus.READY:
      icon = { source: Icon.CircleProgress100, tintColor: Color.Green }
      break
  }

  return {
    value: icon,
    tooltip: status[0].toUpperCase() + status.slice(1),
  }
}

export function getInstanceStateIcon(state: InstanceState) {
  let icon: { source: Icon; tintColor?: Color }

  switch (state) {
    case InstanceState.STOPPED:
    case InstanceState.STOPPED_IN_PLACE:
      icon = { source: Icon.CircleProgress100, tintColor: Color.Red }
      break
    case InstanceState.STARTING:
      icon = { source: Icon.CircleProgress25, tintColor: Color.Blue }
      break
    case InstanceState.RUNNING:
      icon = { source: Icon.CircleProgress100, tintColor: Color.Green }
      break
    case InstanceState.STOPPING:
      icon = { source: Icon.Stop, tintColor: Color.Red }
      break
    case InstanceState.LOCKED:
      icon = { source: Icon.Lock, tintColor: Color.Red }
      break
  }
  return {
    value: icon,
    tooltip: state[0].toUpperCase() + state.slice(1),
  }
}

export function getDatabaseStatusIcon(status: DatabaseStatus) {
  let icon: { source: Icon; tintColor?: Color }

  switch (status) {
    case DatabaseStatus.UNKNOWN:
      icon = { source: Icon.QuestionMarkCircle }
      break
    case DatabaseStatus.AUTOHEALING:
    case DatabaseStatus.BACKUPING:
    case DatabaseStatus.CONFIGURING:
    case DatabaseStatus.INITIALIZING:
    case DatabaseStatus.PROVISIONING:
    case DatabaseStatus.SNAPSHOTTING:
      icon = { source: Icon.CircleProgress100, tintColor: Color.Blue }
      break
    case DatabaseStatus.LOCKED:
      icon = { source: Icon.Lock, tintColor: Color.Red }
      break
    case DatabaseStatus.DISK_FULL:
      icon = { source: Icon.CircleProgress100, tintColor: Color.Red }
      break
    case DatabaseStatus.ERROR:
      icon = { source: Icon.CircleProgress100, tintColor: Color.Red }
      break
    case DatabaseStatus.RESTARTING:
      icon = { source: Icon.CircleProgress25, tintColor: Color.Blue }
      break
    case DatabaseStatus.READY:
      icon = { source: Icon.CircleProgress100, tintColor: Color.Green }
      break
    case DatabaseStatus.DELETING:
      icon = { source: Icon.Stop, tintColor: Color.Red }
      break
  }
  return {
    value: icon,
    tooltip: status[0].toUpperCase() + status.slice(1),
  }
}

export function getRedisClusterStatusIcon(status: RedisClusterStatus) {
  let icon: { source: Icon; tintColor?: Color }

  switch (status) {
    case RedisClusterStatus.UNKNOWN:
      icon = { source: Icon.QuestionMarkCircle }
      break
    case RedisClusterStatus.AUTOHEALING:
    case RedisClusterStatus.CONFIGURING:
    case RedisClusterStatus.INITIALIZING:
    case RedisClusterStatus.PROVISIONING:
      icon = { source: Icon.CircleProgress100, tintColor: Color.Blue }
      break
    case RedisClusterStatus.LOCKED:
      icon = { source: Icon.Lock, tintColor: Color.Red }
      break
    case RedisClusterStatus.ERROR:
    case RedisClusterStatus.SUSPENDED:
      icon = { source: Icon.CircleProgress100, tintColor: Color.Red }
      break
    case RedisClusterStatus.READY:
      icon = { source: Icon.CircleProgress100, tintColor: Color.Green }
      break
    case RedisClusterStatus.DELETING:
      icon = { source: Icon.Stop, tintColor: Color.Red }
      break
  }
  return {
    value: icon,
    tooltip: status[0].toUpperCase() + status.slice(1),
  }
}

export function getCountryImage(region: string) {
  return `flags/${region.toLowerCase().substring(0, 2)}.svg`
}

export function getPrivacyAccessory(privacy: Privacy) {
  switch (privacy) {
    case Privacy.PUBLIC:
      return { icon: { source: Icon.LockUnlocked, tintColor: Color.Green }, tooltip: 'Public' }
    case Privacy.PRIVATE:
      return { icon: Icon.Lock, tooltip: 'Private' }
    case Privacy.UNKOWN_PRIVACY:
      return { icon: Icon.QuestionMarkCircle, tooltip: 'Unknown' }
  }
}

export function getRegistryName(container: Container) {
  return container.registry_image.substring(0, container.registry_image.lastIndexOf('/'))
}

export function getImageName(container: Container) {
  return container.registry_image.split('/').pop()
}

export function bytesToSize(bytes: number) {
  const sizes = ['Bytes', 'Ko', 'Mo', 'Go', 'To', 'Po']
  if (bytes == 0) return '0 Byte'
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1e3)).toString())
  return Math.round(bytes / Math.pow(1e3, i)) + ' ' + sizes[i]
}
