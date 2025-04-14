import { getApplications, showToast, Toast, showHUD } from '@raycast/api'
import { runAppleScript } from '@raycast/utils'

export const APP_NAME = 'LookAway'
export const REQUIRED_VERSION = '1.11.3'
export const APP_BUNDLE_ID = 'com.mysticalbits.lookaway' // Ensure this is correct!

// Simple version comparison (e.g., "1.11.3" vs "1.10.0")
export function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)
    const len = Math.max(parts1.length, parts2.length)

    for (let i = 0; i < len; i++) {
        const n1 = parts1[i] || 0
        const n2 = parts2[i] || 0
        if (n1 > n2) return 1
        if (n1 < n2) return -1
    }
    return 0
}

export async function isLookAwayInstalledAndRecent(): Promise<boolean> {
    const applications = await getApplications()
    const lookAwayApp = applications.find((app) => app.bundleId === APP_BUNDLE_ID)

    if (!lookAwayApp) {
        await showToast({
            style: Toast.Style.Failure,
            title: `${APP_NAME} not found`,
            message: `Please install ${APP_NAME} from lookaway.app`
        })
        return false
    }

    try {
        const versionScript = `tell application id "${APP_BUNDLE_ID}" to get version`
        const installedVersion = await runAppleScript(versionScript)

        if (compareVersions(installedVersion, REQUIRED_VERSION) < 0) {
            await showToast({
                style: Toast.Style.Failure,
                title: `${APP_NAME} version too old`,
                message: `Please update to ${APP_NAME} v${REQUIRED_VERSION} or later.`
            })
            return false
        }
        return true
    } catch (error) {
        console.error('Error getting LookAway version:', error)
        await showToast({
            style: Toast.Style.Failure,
            title: `Could not verify ${APP_NAME} version`,
            message: `Please ensure ${APP_NAME} is running and try again.`
        })
        return false
    }
}

export async function runLookAwayCommand(
    commandName: string,
    commandCode: string,
    successMessage: string,
    durationSeconds?: number
) {
    if (!(await isLookAwayInstalledAndRecent())) {
        return
    }

    let script: string
    let finalSuccessMessage = successMessage

    // Construct the script based on command code and arguments
    switch (commandCode) {
        case 'paustemp':
        case 'pstpnbrk': {
            if (durationSeconds === undefined || durationSeconds <= 0) {
                await showToast({
                    style: Toast.Style.Failure,
                    title: 'Invalid Duration',
                    message: 'Duration must be a positive number of seconds.'
                })
                return
            }
            if (commandCode === 'paustemp') {
                script = `tell application id "${APP_BUNDLE_ID}" to pause temporarily for ${durationSeconds}`
            } else {
                // pstpnbrk
                script = `tell application id "${APP_BUNDLE_ID}" to postpone break by ${durationSeconds}`
            }
            const hours = Math.floor(durationSeconds / 3600)
            const minutes = Math.floor((durationSeconds % 3600) / 60)
            const seconds = durationSeconds % 60

            let formattedDuration = ''
            if (hours > 0) formattedDuration += `${hours}h`
            if (minutes > 0) formattedDuration += `${formattedDuration ? ' ' : ''}${minutes}m`
            if (seconds > 0 || (hours === 0 && minutes === 0))
                formattedDuration += `${formattedDuration ? ' ' : ''}${seconds}s`

            finalSuccessMessage = `${successMessage} for ${formattedDuration}`
            break
        }
        default:
            if (durationSeconds !== undefined) {
                console.warn(
                    `Duration argument provided for command '${commandName}' which does not support it.`
                )
            }
            script = `tell application id "${APP_BUNDLE_ID}" to ${commandName}`
            break
    }

    try {
        await runAppleScript(script)
        await showHUD(finalSuccessMessage)
    } catch (error) {
        console.error(`Error running command ${commandName}:`, error)
        await showToast({
            style: Toast.Style.Failure,
            title: `Failed to run '${commandName}'`,
            message: error instanceof Error ? error.message : 'Unknown AppleScript error'
        })
    }
}
