import { setVolumePreset } from './volume'

export default async function Command() {
    await setVolumePreset('soft')
}
