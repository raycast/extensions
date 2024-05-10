import { closeMainWindow } from '@raycast/api'
import { setVolumePreset } from './volume'

export default async function Command() {
    await closeMainWindow()
    await setVolumePreset('loud')
}
