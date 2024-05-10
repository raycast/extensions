import { runAppleScript } from 'run-applescript'

export async function setVolumePreset(volumePreset: string) {
    await runAppleScript(`tell application "Klack" to volume preset ${volumePreset}`)
}
