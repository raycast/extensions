import { reauthorize } from '@/services/notion/oauth/reauthorize'
import { Action, Icon } from '@raycast/api'

export function ReauthorizeAction() {
  const handleAuthorize = () => {
    reauthorize()
  }

  return (
    <Action
      icon={Icon.Person}
      title={'Authorize'}
      onAction={handleAuthorize}
      shortcut={{ modifiers: ['cmd', 'shift'], key: 'a' }}
    />
  )
}
