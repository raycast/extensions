import { LaunchProps, Toast, showToast } from '@raycast/api'
import { saveUrl } from './utils'

export default async function QuickCapture(props: LaunchProps<{ arguments: Arguments.OmnivoreCapture }>) {
  const { url, labels } = props.arguments

  showToast({
    style: Toast.Style.Animated,
    title: 'Saving Article',
  })

  try {
    const isUrlSaved = await saveUrl(url, labels)
    if (isUrlSaved) {
      showToast({
        style: Toast.Style.Success,
        title: 'Saved!',
        message: 'Your URL was saved',
      })
    }
  } catch (error) {
    console.log(error)
    showToast({
      style: Toast.Style.Failure,
      title: 'Error',
      message: 'An unexpected error occurred',
    })
  }
}
