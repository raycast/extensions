import { runAppleScriptSilently } from './runAppleScriptSilently'

export default async function Command() {
    await runAppleScriptSilently('tell application "Klack" to toggle', false)
}
