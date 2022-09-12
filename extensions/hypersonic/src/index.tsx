import { TokenProvider } from './contexts/token-context'
import { Body } from './views/body'

export default function App() {
  return (
    <TokenProvider>
      <Body />
    </TokenProvider>
  )
}
