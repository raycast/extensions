export function getTitleUrl(title: string | undefined): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const urlMatch = urlRegex.exec(title || 'Untitled')
  if (urlMatch) {
    return urlMatch[0]
  }

  return null
}
