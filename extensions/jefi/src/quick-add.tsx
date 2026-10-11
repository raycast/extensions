import { closeMainWindow, LaunchProps, showToast, Toast } from '@raycast/api'
import { links } from './lib/jefi'
import { openInJefi } from './lib/raycast'

// Jefi parses the sentence and opens its event editor prefilled; the person saves it there.
export default async function QuickAdd(props: LaunchProps<{ arguments: { text: string } }>) {
  const text = props.arguments.text?.trim()
  if (!text) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Describe the event',
      message: 'e.g. Lunch with Nora Friday 1pm',
    })
    return
  }
  await closeMainWindow()
  await openInJefi(links.quickAdd(text))
}
