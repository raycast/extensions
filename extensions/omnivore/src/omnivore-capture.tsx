import { LaunchProps, Toast, showToast } from '@raycast/api'
import { saveUrl } from './utils'

export default async function QuickCapture(props: LaunchProps<{ arguments: Arguments.OmnivoreCapture }>) {
  const { url, labels } = props.arguments

  showToast({
    style: Toast.Style.Animated,
    title: 'Saving Article',
  })

  const urlSaveResponse = await saveUrl(url, labels)
  if (urlSaveResponse.success) {
    showToast({
      style: Toast.Style.Success,
      title: 'Saved!',
      message: urlSaveResponse.message,
    })
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: 'Not Saved',
      message: urlSaveResponse.message,
    })
  }
}
