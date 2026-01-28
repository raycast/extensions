import { reauthorize } from '@/services/notion/oauth/reauthorize'
import { Action } from '@raycast/api'
import { notion } from '@/utils/icons'

export function ReauthorizeAction() {
  const handleAuthorize = () => {
    reauthorize()
  }

  return (
    <Action
      icon={{ source: notion }}
      title={'Reconnect Notion'}
      onAction={handleAuthorize}
      shortcut={{ modifiers: ['cmd', 'shift'], key: 'a' }}
    />
  )
}
