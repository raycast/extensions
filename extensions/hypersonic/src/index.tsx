import { AuthProvider } from '@/features/auth/auth-context'
import { AuthRouter } from '@/features/auth/auth-router'

export default function App() {
  return (
    <AuthProvider>
      <AuthRouter />
    </AuthProvider>
  )
}
