import { useToken } from '@/hooks/use-token'
import { UNAUTHORIZED_TOKEN } from '@/contexts/token-context'

import { ToDoList } from './todo-list'
import { Onboarding } from './onboarding'
import { Transparent } from './transparent'

export function Body() {
  const { token } = useToken()

  if (!token) {
    return <Transparent />
  }

  if (token === UNAUTHORIZED_TOKEN) {
    return <Onboarding />
  }

  return <ToDoList />
}
