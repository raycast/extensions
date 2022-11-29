import { reauthorize } from '@/services/notion/oauth/reauthorize'
import { Action } from '@raycast/api'
import { getNotionIcon } from '@/utils/get-notion-icon'

export function ReauthorizeAction() {
  const handleAuthorize = () => {
    reauthorize()
  }

  return (
    <Action
      icon={{ source: getNotionIcon() }}
      title={'Reconnect Notion'}
      onAction={handleAuthorize}
      shortcut={{ modifiers: ['cmd', 'shift'], key: 'a' }}
    />
  )
}
