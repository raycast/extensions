import { Alert, Toast, confirmAlert, showToast } from '@raycast/api'
import type { Function } from '@scaleway/sdk'
import ActionStyle = Alert.ActionStyle
import Style = Toast.Style

const getErrorMessage = (e: unknown) => {
  if (e instanceof Error) return e.message

  return String(e)
}

export type ActionProps = {
  functionV1beta1: Function.v1beta1.API
  serverlessFunction: Function.v1beta1.Function
  onSuccess: () => Promise<void>
}

export const deployFunction = async ({
  functionV1beta1,
  serverlessFunction,
  onSuccess,
}: ActionProps) => {
  try {
    if (
      await confirmAlert({
        title: 'Are you sure you want to deploy a new function?',
        primaryAction: { title: 'Deploy', style: ActionStyle.Default },
      })
    ) {
      await showToast({
        title: 'Deploying function...',
        message: serverlessFunction.name,
        style: Style.Animated,
      })

      await functionV1beta1.deleteFunction({
        functionId: serverlessFunction.id,
        region: serverlessFunction.region,
      })

      await showToast({
        title: 'Function successfully deployed',
        message: serverlessFunction.name,
        style: Style.Success,
      })

      await onSuccess()
    }
  } catch (error) {
    await showToast({
      title: 'Error while deploying function',
      message: getErrorMessage(error),
      style: Toast.Style.Failure,
    })
  }

  return false
}
