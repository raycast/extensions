import { useAuth } from '@/features/auth/use-auth'
import { UNAUTHORIZED_TOKEN } from '@/features/auth/auth-context'
import { TodoList } from '@/features/todo-list'
import { Onboarding } from '@/features/onboarding'
import { Transparent } from './transparent'

export function AuthRouter() {
  const { token } = useAuth()

  if (!token) {
    return <Transparent />
  }

  if (token === UNAUTHORIZED_TOKEN) {
    return <Onboarding />
  }

  return <TodoList />
}
