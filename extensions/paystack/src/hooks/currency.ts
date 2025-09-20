import { useCallback } from 'react'

export function useCurrencyFormatter() {
  return useCallback((amount: number, currency: string) => {
    const normalizedAmount = amount / 100
    return new Intl.NumberFormat(getCurrencyLocale(currency), {
      style: 'currency',
      currency,
    }).format(normalizedAmount)
  }, [])
}
const currencyLocaleMap: Record<string, string> = {
  NGN: 'en-NG',
  GHS: 'en-GH',
  ZAR: 'en-ZA',
  KES: 'en-KE',
  XOF: 'fr-CI',
}

export function getCurrencyLocale(currency: string): string {
  return currencyLocaleMap[currency] || 'en-US'
}
