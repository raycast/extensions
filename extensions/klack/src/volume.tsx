import { runAppleScriptSilently } from './runAppleScriptSilently'

export async function setVolumePreset(volumePreset: string) {
    await runAppleScriptSilently(`tell application "Klack" to volume preset ${volumePreset}`, false)
}
