export function getContentUrl(
  title: string | undefined,
  url?: string | null
): string | null {
  if (url) return url

  const urlRegex = /(https?:\/\/[^\s]+)/g
  const urlMatch = urlRegex.exec(title || 'Untitled')
  if (urlMatch) {
    return urlMatch[0]
  }

  return null
}
