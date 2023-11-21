import { LaunchProps, Toast, showToast } from '@raycast/api'
import { saveUrl } from './utils'

export default async function QuickCapture(props: LaunchProps<{ arguments: Arguments.OmnivoreCapture }>) {
  const { url, labels } = props.arguments

  showToast({
    style: Toast.Style.Animated,
    title: 'Saving Article',
  })

  const isUrlSaved = await saveUrl(url, labels)
  if (isUrlSaved) {
    showToast({
      style: Toast.Style.Success,
      title: 'Saved!',
      message: 'Your URL was saved',
    })
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: 'Not Saved',
      message: 'Your URL was not saved',
    })
  }
}
