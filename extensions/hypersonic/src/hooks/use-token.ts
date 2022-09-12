import { useContext } from 'react'
import { TokenContext } from '@/contexts/token-context'

export const useToken = () => {
  return useContext(TokenContext)
}
