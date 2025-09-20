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
