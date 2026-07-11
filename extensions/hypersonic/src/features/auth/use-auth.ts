import { useContext } from 'react'
import { AuthContext } from '@/features/auth/auth-context'

export const useAuth = () => {
  return useContext(AuthContext)
}
