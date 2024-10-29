import {useState, useEffect} from 'react'
import {getApplications, showToast, Toast, open} from '@raycast/api'
import {type AsyncState} from '@raycast/utils'

export function useInstalled(bundleId: string): AsyncState<boolean> {
    const [isInstalled, setIsInstalled] = useState<boolean | null>(null)

    useEffect(() => {
        async function checkFlighty() {
            const applications = await getApplications()
            return applications.some((app) => app.bundleId === bundleId)
        }

        checkFlighty().then(setIsInstalled)
    }, [])

    if (isInstalled === null) return {isLoading: true}

    // show download link
    if (!isInstalled) {
        showToast({
            style: Toast.Style.Failure,
            title: 'Flighty not installed.',
            message: 'Install from the App Store.',
            primaryAction: {
                title: 'Open in App Store',
                onAction: (toast) => {
                    open('https://apps.apple.com/app/id1358823008')
                    toast.hide()
                },
            },
        })
    }

    return {isLoading: false, data: isInstalled}
}
