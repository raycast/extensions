import { useEffect, useRef, useState } from 'react'
import { ActionPanel, Action, Form } from '@raycast/api'
import { CachedQueryClientProvider } from '../components/CachedQueryClientProvider'
import { trpc } from '@/utils/trpc.util'
import { handleSignIn } from '@/handle-signin'
import { useAtom } from 'jotai'
import { useNavigation } from '@raycast/api'
import { sessionTokenAtom } from '@/states/session-token.state'

function Body() {
  const { pop } = useNavigation()
  const [, setSessionToken] = useAtom(sessionTokenAtom)
  const [sentToken, setSentToken] = useState(false)
  const { mutateAsync, isPending } = trpc.login.generateMagicLink.useMutation()
  const verificationTokenRef = useRef<Form.TextField>(null)

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')

  const [isLoginPending, setIsLoginPending] = useState(false)
  const isLoading = isPending || isLoginPending
  const requestToToken = async (email: string) => {
    await mutateAsync({ email })

    setSentToken(true)
  }

  useEffect(() => {
    if (!sentToken) {
      return
    }

    verificationTokenRef.current?.focus()
  }, [sentToken])

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={sentToken && email ? 'Login' : 'Send Login Code to Email'}
            onSubmit={async () => {
              if (!sentToken && email) {
                requestToToken(email)
                return
              }

              if (sentToken && email && code) {
                setIsLoginPending(true)
                await handleSignIn({
                  email,
                  token: code,
                  onSuccess: (sessionToken: string) => {
                    setSessionToken(sessionToken)
                    // Onboarding 뷰를 거치지 않고 사용할 땐 pop하지 않는다.
                    // pop()
                  },
                })
                setIsLoginPending(false)
              }
            }}
          />
        </ActionPanel>
      }
    >
      {!sentToken && (
        <>
          <Form.Description text="👋🏼 Input Email to Login" />
          <Form.TextField id="email" title="Email" placeholder="Email" onChange={(e) => setEmail(e)} />
          <Form.Description text='Press "Command(⌘) + Enter"' />
        </>
      )}

      {sentToken && (
        <>
          <Form.Description text={`Login code sent to ${email} email.`} />
          <Form.Description text={`Enter the 6-digit login code sent to your email.`} />
          <Form.TextField
            ref={verificationTokenRef}
            id="verificationToken"
            title="Verification Token"
            placeholder="Verification Token"
            onChange={(e) => setCode(e)}
          />
          <Form.Description text='Press "Command(⌘) + Enter" again to login' />
        </>
      )}
    </Form>
  )
}

export function LoginView() {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  )
}
