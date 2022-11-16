import { Instance } from '../scaleway/types'
import { Alert, confirmAlert, Icon, showToast, Toast } from '@raycast/api'
import { catchError, ScalewayAPI } from '../scaleway/api'
import ActionStyle = Alert.ActionStyle
import Style = Toast.Style
import { InstancesAPI } from '../scaleway/instances-api'

export async function rebootInstance(instance: Instance) {
  try {
    if (
      await confirmAlert({
        title: 'Are you sure you want to reboot this instance?',
        icon: Icon.RotateClockwise,
        primaryAction: { title: 'Reboot', style: ActionStyle.Default },
      })
    ) {
      await showToast({
        title: 'Rebooting instance...',
        message: instance.name,
        style: Style.Animated,
      })

      await InstancesAPI.rebootInstance(instance)

      await showToast({
        title: 'Instance successfully rebooted',
        message: instance.name,
        style: Style.Success,
      })

      return true
    }
  } catch (error) {
    await catchError(error, 'Error while rebooting instance')
  }
  return false
}

export async function powerOnInstance(instance: Instance) {
  try {
    if (
      await confirmAlert({
        title: 'Are you sure you want to power on this instance?',
        icon: Icon.Play,
        primaryAction: { title: 'Power On', style: ActionStyle.Default },
      })
    ) {
      await showToast({
        title: 'Powering on instance..',
        message: instance.name,
        style: Style.Animated,
      })

      await InstancesAPI.powerOnInstance(instance)

      await showToast({
        title: 'Instance successfully powered on',
        message: instance.name,
        style: Style.Success,
      })

      return true
    }
  } catch (error) {
    await catchError(error, 'Error while powering on instance')
  }
  return false
}

export async function powerOffInstance(instance: Instance) {
  try {
    if (
      await confirmAlert({
        title: 'Are you sure you want to shutdown this instance?',
        icon: Icon.Stop,
        primaryAction: { title: 'Shutdown', style: ActionStyle.Destructive },
      })
    ) {
      await showToast({
        title: 'Shutting down instance...',
        message: instance.name,
        style: Style.Animated,
      })

      await InstancesAPI.powerOffInstance(instance)

      await showToast({
        title: 'Instance successfully shutdown',
        message: instance.name,
        style: Style.Success,
      })

      return true
    }
  } catch (error) {
    await catchError(error, 'Error while shutting down instance')
  }
  return false
}
