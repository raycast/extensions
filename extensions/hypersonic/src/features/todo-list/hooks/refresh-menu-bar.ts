import { launchCommand, LaunchType } from '@raycast/api'

export async function refreshMenuBar() {
  await launchCommand({
    name: 'active-todos',
    type: LaunchType.Background,
  })
}
