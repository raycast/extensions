import { getPreferenceValues } from '@raycast/api'
import { useState } from 'react'
import { PaystackResponse } from '../utils/types'

interface PaystackError {
  status: boolean
  message: string
}

export function usePaystack() {
  const { liveSecretKey, testSecretKey, mode } =
    getPreferenceValues<Preferences>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const secretKey = mode === 'live' ? liveSecretKey : testSecretKey

  const baseUrl = 'https://api.paystack.co'

  async function paystackFetch<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<PaystackResponse<T>> {
    if (!secretKey) {
      throw new Error(
        'No API key provided. Please add your Paystack secret key in preferences.',
      )
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error((data as PaystackError).message || 'An error occurred')
      }
      return data as PaystackResponse<T>
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unknown error occurred'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    error,
    get: <T>(endpoint: string) => paystackFetch<T>(endpoint, { method: 'GET' }),
    post: <T>(endpoint: string, body: unknown) =>
      paystackFetch<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    put: <T>(endpoint: string, body: unknown) =>
      paystackFetch<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    delete: <T>(endpoint: string) =>
      paystackFetch<T>(endpoint, { method: 'DELETE' }),
  }
}
