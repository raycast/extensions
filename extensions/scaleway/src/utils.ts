import { Color, Icon } from '@raycast/api'
import { Container, Instance, RDB, Redis, Region, Zone } from '@scaleway/sdk'

export function getContainerStatusIcon(status: Container.v1beta1.ContainerStatus) {
  let icon: { source: Icon; tintColor?: Color }

  switch (status) {
    case 'unknown':
      icon = { source: Icon.QuestionMarkCircle }
      break
    case 'deleting':
      icon = { source: Icon.Stop, tintColor: Color.Red }
      break
    case 'error':
      icon = { source: Icon.CircleProgress100, tintColor: Color.Red }
      break
    case 'locked':
      icon = { source: Icon.Lock, tintColor: Color.Green }
      break
    case 'creating':
      icon = { source: Icon.CircleProgress25, tintColor: Color.Green }
      break
    case 'pending':
      icon = { source: Icon.CircleProgress100, tintColor: Color.Blue }
      break
    case 'ready':
    case 'created':
      icon = { source: Icon.CircleProgress100, tintColor: Color.Green }
      break
  }

  return {
    value: icon,
    tooltip: status[0].toUpperCase() + status.slice(1),
  }
}

export function getInstanceStateIcon(state: Instance.v1.ServerState) {
  let icon: { source: Icon; tintColor?: Color }

  switch (state) {
    case 'stopped':
    case 'stopped in place':
      icon = { source: Icon.CircleProgress100, tintColor: Color.Red }
      break
    case 'starting':
      icon = { source: Icon.CircleProgress25, tintColor: Color.Blue }
      break
    case 'running':
      icon = { source: Icon.CircleProgress100, tintColor: Color.Green }
      break
    case 'stopping':
      icon = { source: Icon.Stop, tintColor: Color.Red }
      break
    case 'locked':
      icon = { source: Icon.Lock, tintColor: Color.Red }
      break
  }
  return {
    value: icon,
    tooltip: state[0].toUpperCase() + state.slice(1),
  }
}

export function getDatabaseStatusIcon(status: RDB.v1.InstanceStatus) {
  let icon: { source: Icon; tintColor?: Color }

  switch (status) {
    case 'unknown':
      icon = { source: Icon.QuestionMarkCircle }
      break
    case 'autohealing':
    case 'backuping':
    case 'configuring':
    case 'initializing':
    case 'provisioning':
    case 'snapshotting':
      icon = { source: Icon.CircleProgress100, tintColor: Color.Blue }
      break
    case 'locked':
      icon = { source: Icon.Lock, tintColor: Color.Red }
      break
    case 'disk_full':
      icon = { source: Icon.CircleProgress100, tintColor: Color.Red }
      break
    case 'error':
      icon = { source: Icon.CircleProgress100, tintColor: Color.Red }
      break
    case 'restarting':
      icon = { source: Icon.CircleProgress25, tintColor: Color.Blue }
      break
    case 'ready':
      icon = { source: Icon.CircleProgress100, tintColor: Color.Green }
      break
    case 'deleting':
      icon = { source: Icon.Stop, tintColor: Color.Red }
      break
  }
  return {
    value: icon,
    tooltip: status[0].toUpperCase() + status.slice(1),
  }
}

export function getRedisClusterStatusIcon(status: Redis.v1.ClusterStatus) {
  let icon: { source: Icon; tintColor?: Color }

  switch (status) {
    case 'unknown':
      icon = { source: Icon.QuestionMarkCircle }
      break
    case 'autohealing':
    case 'configuring':
    case 'initializing':
    case 'provisioning':
      icon = { source: Icon.CircleProgress100, tintColor: Color.Blue }
      break
    case 'locked':
      icon = { source: Icon.Lock, tintColor: Color.Red }
      break
    case 'error':
    case 'suspended':
      icon = { source: Icon.CircleProgress100, tintColor: Color.Red }
      break
    case 'ready':
      icon = { source: Icon.CircleProgress100, tintColor: Color.Green }
      break
    case 'deleting':
      icon = { source: Icon.Stop, tintColor: Color.Red }
      break
  }
  return {
    value: icon,
    tooltip: status[0].toUpperCase() + status.slice(1),
  }
}

export function getCountryImage(region: Region | Zone) {
  return `flags/${region.toLowerCase().substring(0, 2)}.svg`
}

export function getPrivacyAccessory(privacy: Container.v1beta1.ContainerPrivacy) {
  switch (privacy) {
    case 'public':
      return { icon: { source: Icon.LockUnlocked, tintColor: Color.Green }, tooltip: 'Public' }
    case 'private':
      return { icon: Icon.Lock, tooltip: 'Private' }
    case 'unknown_privacy':
      return { icon: Icon.QuestionMarkCircle, tooltip: 'Unknown' }
  }
}

export function getRegistryName(container: Container.v1beta1.Container) {
  return container.registryImage.substring(0, container.registryImage.lastIndexOf('/'))
}

export function getImageName(container: Container.v1beta1.Container) {
  return container.registryImage.split('/').pop()
}

export function bytesToSize(bytes?: number) {
  if (bytes === undefined) return 'unknown'

  const sizes = ['Bytes', 'Ko', 'Mo', 'Go', 'To', 'Po']
  if (bytes == 0) return '0 Byte'
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1e3)).toString())
  return Math.round(bytes / Math.pow(1e3, i)) + ' ' + sizes[i]
}
