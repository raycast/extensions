/**
 * Format a number with commas
 * @param number The number to format
 * @returns The formatted number
 * @example
 * formatNumber(1000) // 1,000
 * formatNumber(1000000) // 1,000,000
 * formatNumber(1000000000) // 1,000,000,000
 */
export const formatNumber = (number: number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
