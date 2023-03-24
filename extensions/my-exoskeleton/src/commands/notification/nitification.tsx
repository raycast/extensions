import { getFrontmostApplication, showHUD } from '@raycast/api'
import { useExec } from '@raycast/utils'

export async function NotificationCommand() {
  const application = await getFrontmostApplication()

  console.log('Application', application)
  // useExec(`osascript -e 'display notification "Lorem ipsum dolor sit amet" with title "Title"'`)
  const { data } = useExec('brew', ['list'])

  return showHUD('Res: ' + data)
}
