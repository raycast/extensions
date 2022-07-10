import { reauthorize } from '@/services/notion/oauth/reauthorize'
import { Action, Icon } from '@raycast/api'

export function ReauthorizeAction({ getInitialData }: any) {
  const handleAuthorize = () => {
    reauthorize().then(() => getInitialData())
  }

  return (
    <Action
      icon={Icon.Person}
      title={'Authorize'}
      onAction={handleAuthorize}
      shortcut={{ modifiers: ['cmd'], key: 's' }}
    />
  )
}
