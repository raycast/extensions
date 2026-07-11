import { useAuth } from '@/features/auth/use-auth'
import { UNAUTHORIZED_TOKEN } from '@/features/auth/auth-context'
import { TodoList } from '@/features/todo-list'
import { Onboarding } from '@/features/onboarding'
import { Transparent } from './transparent'
import ConfigurationForm from '../configuration-form/configuration-form'
import { useLocalPreferences } from '@/services/notion/hooks/use-local-preferences'

export function AuthRouter() {
  const { token } = useAuth()
  const { preferences, revalidatePreferences } = useLocalPreferences()

  if (!token) {
    return <Transparent />
  }

  if (token === UNAUTHORIZED_TOKEN) {
    return <Onboarding />
  }

  if (!preferences?.databaseId) {
    return <ConfigurationForm revalidate={revalidatePreferences} />
  }

  return <TodoList />
}
