import { useAuth } from '@/features/auth/use-auth'
import { Action } from '@raycast/api'
import { authorize } from '@/services/notion/oauth/authorize'
import { getNotionIcon } from '@/utils/get-notion-icon'

export function AuthorizationAction({
  onAuthorize,
}: {
  onAuthorize: () => void
}) {
  const { actions } = useAuth()

  const handleAuthorize = async () => {
    const token = await authorize()

    if (token) {
      onAuthorize()

      actions.setToken(token)
    }
  }

  return (
    <Action
      icon={{ source: getNotionIcon() }}
      title={'Authorize'}
      onAction={handleAuthorize}
      shortcut={{ modifiers: ['cmd', 'shift'], key: 'a' }}
    />
  )
}
