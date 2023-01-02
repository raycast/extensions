import { Container } from '@scaleway/sdk'
import { confirmAlert, showToast, Toast } from '@raycast/api'
import { getErrorMessage } from '../helpers/errors'
import Style = Toast.Style

export async function deployContainer(
  api: Container.v1beta1.API,
  container: Container.v1beta1.Container,
  revalidate: () => void
) {
  try {
    if (await confirmAlert({ title: 'Are you sure you want to deploy a new container?' })) {
      await showToast({
        title: 'Deploying container...',
        message: container.name,
        style: Style.Animated,
      })

      await api.deployContainer({ containerId: container.id, region: container.region })

      await showToast({
        title: 'Container successfully deployed',
        message: container.name,
        style: Style.Success,
      })

      revalidate()
    }
  } catch (error) {
    await showToast({
      title: 'Error while deploying container',
      message: getErrorMessage(error),
      style: Toast.Style.Failure,
    })
  }
}
