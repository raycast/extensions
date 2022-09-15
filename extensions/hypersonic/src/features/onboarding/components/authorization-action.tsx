import { useAuth } from '@/features/auth/use-auth'
import { Action, Icon } from '@raycast/api'
import { authorize } from '@/services/notion/oauth/authorize'

export function AuthorizationAction() {
  const { actions } = useAuth()

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
      shortcut={{ modifiers: ['cmd', 'shift'], key: 'a' }}
    />
  )
}
