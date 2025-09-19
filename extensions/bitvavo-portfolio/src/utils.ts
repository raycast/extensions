import { Color, Image } from '@raycast/api'

/**
 * Formats a currency amount with English conventions
 * Euro symbol before the number, no space, minus before symbol for negatives
 * Examples: €1,234.56, -€1,234.56
 */
export const formatCurrency = (
  value: number,
  currencySymbol: string = '€',
): string => {
  const absValue = Math.abs(value)
  const formattedValue = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue)

  return `${currencySymbol}${formattedValue}`
}

/**
 * Formats a signed currency value with color coding
 * Examples: +€1,234.56 (green), -€1,234.56 (red)
 */
export const formatSignedCurrencyWithColor = (
  value: number,
  currencySymbol: string = '€',
): { color: Color; value: string } => {
  const absValue = Math.abs(value)
  const formattedValue = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue)

  const color = value >= 0 ? Color.Green : Color.Red
  const sign = value >= 0 ? '+' : '-'

  return {
    color,
    value: `${sign}${currencySymbol}${formattedValue}`,
  }
}

/**
 * Formats a signed percentage with color coding
 * Examples: +5.25% (green), -3.50% (red)
 */
export const formatSignedPercentageWithColor = (
  value: number,
): { color: Color; value: string } => {
  const formattedValue = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))

  const color = value >= 0 ? Color.Green : Color.Red
  const sign = value >= 0 ? '+' : '-'

  return {
    color,
    value: `${sign}${formattedValue}%`,
  }
}

/**
 * Gets cryptocurrency icon URL
 */
export const getCryptocurrencyIcon = (symbol: string): Image => {
  const baseUrl =
    'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/refs/heads/master/32/color'
  const iconUrl = `${baseUrl}/${symbol.toLowerCase()}.png`

  return {
    source: iconUrl,
    fallback: `${baseUrl}/generic.png`,
  }
}

/**
 * Converts technical API error messages into user-friendly error messages
 */
export function getUserFriendlyErrorMessage(originalError: string): string {
  const error = originalError.toLowerCase()

  if (
    error.includes('invalid api key') ||
    error.includes('unauthorized') ||
    error.includes('403')
  ) {
    return 'Invalid API credentials. Please check your Bitvavo API key and secret in the extension preferences.'
  }

  if (
    error.includes('network') ||
    error.includes('connection') ||
    error.includes('timeout')
  ) {
    return 'Connection failed. Please check your internet connection and try again.'
  }

  if (error.includes('rate limit') || error.includes('429')) {
    return 'Too many requests. Please wait a moment and try again.'
  }

  if (error.includes('api key must be of length')) {
    return 'API key format is incorrect. Please ensure you copied the complete API key from your Bitvavo account.'
  }

  if (
    error.includes('insufficient privileges') ||
    error.includes('permissions')
  ) {
    return 'API key permissions are insufficient. Please ensure your API key has read permissions enabled.'
  }

  return 'Unable to connect to Bitvavo. Please check your API credentials and internet connection.'
}

/**
 * Validates Bitvavo API credentials format and content
 */
export function validateApiCredentials(
  apiKey: string,
  apiSecret: string,
): string | null {
  if (!apiKey || !apiSecret) {
    return 'API credentials are required. Please enter your Bitvavo API key and secret in the extension preferences.'
  }

  if (apiKey.length !== 64) {
    return 'API key must be exactly 64 characters long. Please check your API key in the Bitvavo account settings.'
  }

  if (apiSecret.length !== 128) {
    return 'API secret must be exactly 128 characters long. Please check your API secret in the Bitvavo account settings.'
  }

  if (!/^[a-f0-9]+$/i.test(apiKey)) {
    return 'API key must contain only hexadecimal characters (0-9, a-f). Please check your API key.'
  }

  if (!/^[a-f0-9]+$/i.test(apiSecret)) {
    return 'API secret must contain only hexadecimal characters (0-9, a-f). Please check your API secret.'
  }

  return null
}
