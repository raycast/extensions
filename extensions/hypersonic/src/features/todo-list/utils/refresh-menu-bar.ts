import { launchCommand, LaunchType } from '@raycast/api'

export async function refreshMenuBar() {
  try {
    await launchCommand({
      name: 'active-todos',
      type: LaunchType.Background,
    })
  } catch (error) {
    return
  }
}
