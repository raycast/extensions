import { closeMainWindow } from '@raycast/api'
import { runAppleScript } from 'run-applescript'

export default async function Command() {
    await closeMainWindow()
    await runAppleScript('tell application "Klack" to toggle')
}
