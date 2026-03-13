export function truncate(str: string) {
  return str.length > 40 ? str.slice(0, 40 - 1) + '...' : str
}
