import { Action, Icon } from '@raycast/api'
import { showSuccessToast, showErrorToast } from '../ui/toast'
import { clearCache, preferences } from '../helpers'

export default function Cache() {
    if (!preferences.enableProjectsCaching) {
        return null
    }

    async function handleClearCache() {
        try {
            clearCache()
            await showSuccessToast('Cache cleared')
        } catch (error) {
            await showErrorToast('Failed to clear cache')
        }
    }

    return (
        <Action
            title="Clear Cache"
            key="clear-cache"
            icon={Icon.Trash}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'delete' }}
            onAction={handleClearCache}
        />
    )
}
