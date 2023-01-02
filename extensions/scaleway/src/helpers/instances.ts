import { Color, Icon } from '@raycast/api'
import { Instance } from '@scaleway/sdk'
import { capitalize } from './index'

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
    tooltip: capitalize(state),
  }
}
