import { Color, Icon } from '@raycast/api'
import { Redis } from '@scaleway/sdk'
import { capitalize } from './index'

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
    tooltip: capitalize(status),
  }
}
