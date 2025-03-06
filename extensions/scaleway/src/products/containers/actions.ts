import { Alert, Toast, confirmAlert, showToast } from '@raycast/api'
import type { Container } from '@scaleway/sdk'
import ActionStyle = Alert.ActionStyle
import Style = Toast.Style

const getErrorMessage = (e: unknown) => {
  if (e instanceof Error) return e.message

  return String(e)
}

export type ActionProps = {
  containerV1Beta1: Container.v1beta1.API
  container: Container.v1beta1.Container
  onSuccess: () => Promise<void>
}

export const deployContainer = async ({ containerV1Beta1, container, onSuccess }: ActionProps) => {
  try {
    if (
      await confirmAlert({
        title: 'Are you sure you want to deploy a new container?',
        primaryAction: { title: 'Deploy', style: ActionStyle.Default },
      })
    ) {
      await showToast({
        title: 'Deploying container...',
        message: container.name,
        style: Style.Animated,
      })

      await containerV1Beta1.deployContainer({
        containerId: container.id,
        region: container.region,
      })

      await showToast({
        title: 'Container successfully deployed',
        message: container.name,
        style: Style.Success,
      })

      await onSuccess()
    }
  } catch (error) {
    await showToast({
      title: 'Error while deploying container',
      message: getErrorMessage(error),
      style: Toast.Style.Failure,
    })
  }

  return false
}
