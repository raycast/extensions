import { encode } from 'gpt-3-encoder'
import { useState } from 'react'

export default function useTokens() {
  const [tokens, setTokens] = useState(0)

  function updateTokens(text: string) {
    const tokens = encode(text)
    setTokens(tokens.length)
  }

  return { tokens, updateTokens }
}
