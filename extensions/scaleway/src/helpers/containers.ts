import { Color, Icon } from '@raycast/api'
import { Container } from '@scaleway/sdk'
import { capitalize } from './index'

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
    tooltip: capitalize(status),
  }
}

export function getImageName(container: Container.v1beta1.Container) {
  return container.registryImage.split('/').pop()
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
