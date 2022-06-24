import { useToken } from '@/hooks/use-token'
import { Action, Icon } from '@raycast/api'
import { authorize } from '@/services/notion/oauth/authorize'

export function AuthorizationAction() {
  const { actions } = useToken()

  const handleAuthorize = async () => {
    const token = await authorize()

    if (token) {
      actions.setToken(token)
    }
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
