import { Alert, confirmAlert, Icon, showToast, Toast } from '@raycast/api'
import { Instance } from '@scaleway/sdk'
import { getErrorMessage } from '../helpers/errors'
import ActionStyle = Alert.ActionStyle
import Style = Toast.Style

export async function rebootInstance(
  api: Instance.v1.API,
  instance: Instance.v1.Server,
  revalidate: () => void
) {
  try {
    if (
      await confirmAlert({
        title: 'Are you sure you want to reboot this instance?',
        icon: Icon.RotateClockwise,
        primaryAction: { title: 'Reboot', style: ActionStyle.Destructive },
      })
    ) {
      await showToast({
        title: 'Rebooting instance...',
        message: instance.name,
        style: Style.Animated,
      })

      await api.serverAction({ serverId: instance.id, action: 'reboot' })

      await showToast({
        title: 'Instance successfully rebooted',
        message: instance.name,
        style: Style.Success,
      })

      revalidate()
    }
  } catch (error) {
    await showToast({
      title: 'Error while rebooting instance',
      message: getErrorMessage(error),
      style: Toast.Style.Failure,
    })
  }
  return false
}

export async function powerOnInstance(
  api: Instance.v1.API,
  instance: Instance.v1.Server,
  revalidate: () => void
) {
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

      await api.serverAction({ serverId: instance.id, action: 'poweron' })

      await showToast({
        title: 'Instance successfully powered on',
        message: instance.name,
        style: Style.Success,
      })

      revalidate()
    }
  } catch (error) {
    await showToast({
      title: 'Error while powering instance',
      message: getErrorMessage(error),
      style: Toast.Style.Failure,
    })
  }
  return false
}

export async function powerOffInstance(
  api: Instance.v1.API,
  instance: Instance.v1.Server,
  revalidate: () => void
) {
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

      await api.serverAction({ serverId: instance.id, action: 'poweroff' })

      await showToast({
        title: 'Instance successfully shutdown',
        message: instance.name,
        style: Style.Success,
      })

      revalidate()
    }
  } catch (error) {
    await showToast({
      title: 'Error while shutting down instance',
      message: getErrorMessage(error),
      style: Toast.Style.Failure,
    })
  }
  return false
}
