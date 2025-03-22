import { Action, Icon } from '@raycast/api'
import { withToast } from '../ui/toast'
import { clearCache, preferences } from '../helpers'

export default function Cache() {
    if (!preferences.enableProjectsCaching) {
        return null
    }

    return (
        <Action
            title="Clear Cache"
            key="clear-cache"
            icon={Icon.Trash}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'delete' }}
            onAction={withToast({
                action: () => {
                    clearCache()
                    return Promise.resolve()
                },
                onSuccess: () => 'Cache cleared',
                onFailure: () => 'Failed to clear cache',
            })}
        />
    )
}
