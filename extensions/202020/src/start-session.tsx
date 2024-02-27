import { LaunchType, closeMainWindow, launchCommand } from '@raycast/api'

export default async function Command() {
  try {
    await launchCommand({
      name: 'menu-bar',
      type: LaunchType.UserInitiated,
      context: { autoStartNewSession: true },
    })
  } catch (e) {
    console.error('Error launching command')
  }
  closeMainWindow()
}
