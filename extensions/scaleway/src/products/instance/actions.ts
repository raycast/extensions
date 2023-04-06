import { Alert, Icon, Toast, confirmAlert, showToast } from '@raycast/api'
import type { Instance } from '@scaleway/sdk'
import ActionStyle = Alert.ActionStyle
import Style = Toast.Style

export const getErrorMessage = (e: unknown) => {
  if (e instanceof Error) return e.message

  return String(e)
}

type ActionProps = {
  api: Instance.v1.API
  server: Instance.v1.Server
  onSuccess: () => Promise<void> | void
}

export const rebootInstance = async ({ api, server, onSuccess }: ActionProps) => {
  try {
    if (
      await confirmAlert({
        title: 'Are you sure you want to reboot this server?',
        icon: Icon.RotateClockwise,
        primaryAction: { title: 'Reboot', style: ActionStyle.Destructive },
      })
    ) {
      await showToast({
        title: 'Rebooting server...',
        message: server.name,
        style: Style.Animated,
      })

      await api.serverAction({ serverId: server.id, action: 'reboot', zone: server.zone })

      await showToast({
        title: 'Server successfully rebooted',
        message: server.name,
        style: Style.Success,
      })

      await onSuccess()
    }
  } catch (error) {
    await showToast({
      title: 'Error while rebooting server',
      message: getErrorMessage(error),
      style: Toast.Style.Failure,
    })
  }

  return false
}

export const powerOnInstance = async ({ api, server, onSuccess }: ActionProps) => {
  try {
    if (
      await confirmAlert({
        title: 'Are you sure you want to power on this server?',
        icon: Icon.Play,
        primaryAction: { title: 'Power On', style: ActionStyle.Default },
      })
    ) {
      await showToast({
        title: 'Powering on server..',
        message: server.name,
        style: Style.Animated,
      })

      await api.serverAction({ serverId: server.id, action: 'poweron', zone: server.zone })

      await showToast({
        title: 'Server successfully powered on',
        message: server.name,
        style: Style.Success,
      })

      await onSuccess()
    }
  } catch (error) {
    await showToast({
      title: 'Error while powering server',
      message: getErrorMessage(error),
      style: Toast.Style.Failure,
    })
  }

  return false
}

export const powerOffInstance = async ({ api, server, onSuccess }: ActionProps) => {
  try {
    if (
      await confirmAlert({
        title: 'Are you sure you want to shutdown this Server?',
        icon: Icon.Stop,
        primaryAction: { title: 'Shutdown', style: ActionStyle.Destructive },
      })
    ) {
      await showToast({
        title: 'Shutting down server...',
        message: server.name,
        style: Style.Animated,
      })

      await api.serverAction({ serverId: server.id, action: 'poweroff', zone: server.zone })

      await showToast({
        title: 'Server successfully shutdown',
        message: server.name,
        style: Style.Success,
      })

      await onSuccess()
    }
  } catch (error) {
    await showToast({
      title: 'Error while shutting down server',
      message: getErrorMessage(error),
      style: Toast.Style.Failure,
    })
  }

  return false
}
