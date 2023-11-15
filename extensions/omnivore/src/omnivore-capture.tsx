import { LaunchProps, Toast, showToast } from '@raycast/api'
import { useNavigation } from '@raycast/api'
import { saveUrl } from './utils'

export default function QuickCapture(props: LaunchProps<{ arguments: Arguments.OmnivoreCapture }>) {
  const { pop } = useNavigation()
  const { url, labels } = props.arguments

  async function onSave() {
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
        title: 'Error',
        message: 'An unexpected error occurred',
      })
    }
    pop()
  }
  onSave()
}
