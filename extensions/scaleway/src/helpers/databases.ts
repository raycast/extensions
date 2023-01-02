import { Color, Icon } from '@raycast/api'
import { RDB } from '@scaleway/sdk'
import { capitalize } from './index'

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
    tooltip: capitalize(status),
  }
}
