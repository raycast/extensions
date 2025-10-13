import { Toast, closeMainWindow, getApplications, showToast } from '@raycast/api'
import { runAppleScript } from 'run-applescript'

export async function runAppleScriptSilently(appleScript: string, inView: boolean) {
    if (!inView) await closeMainWindow()

    const applications = await getApplications()
    const isInstalled = applications.some(({ bundleId }) => bundleId === 'com.henrikruscon.Klack')

    if (!isInstalled) {
        const options: Toast.Options = {
            style: Toast.Style.Failure,
            title: 'Klack is not installed.'
        }

        await showToast(options)

        return false
    }

    try {
        const result = await runAppleScript(appleScript)

        return result
    } catch (_) {
        await showToast({
            style: Toast.Style.Failure,
            title: 'Klack v1.7.0 is required.'
        })
    }
}
