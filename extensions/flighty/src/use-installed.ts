import {useState, useEffect} from 'react'
import {getApplications} from '@raycast/api'
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
    return {isLoading: false, data: isInstalled}
}
