import { Action, ActionPanel, List } from '@raycast/api'
import { ulid } from 'ulid'
import { handleSignIn } from '../handle-signin'
import { LoginView } from '@/views/LoginView'
import { useAtom } from 'jotai'
import { sessionTokenAtom } from '@/states/session-token.state'

export function Onboarding() {
  const [, setSessionToken] = useAtom(sessionTokenAtom)

  return (
    <List>
      <List.Item
        title={'1. Email로 로그인해서 안전하고 편리하게 사용할게요.'}
        actions={
          <ActionPanel>
            <Action.Push title="Select" target={<LoginView />} />
          </ActionPanel>
        }
      />
      <List.Item
        title={'2. 일단 로그인 없이 사용하며 둘러볼게요.'}
        actions={
          <ActionPanel>
            <Action
              title="Select"
              onAction={() => {
                handleSignIn({
                  email: `tmp-${ulid()}@1bookmark.commit2.app`,
                  token: '123123',
                  onSuccess: (token: string) => {
                    setSessionToken(token)
                  },
                })
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  )
}
