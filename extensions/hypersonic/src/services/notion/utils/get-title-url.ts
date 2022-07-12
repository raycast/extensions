export function getTitleUrl(title: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const urlMatch = urlRegex.exec(title)
  if (urlMatch) {
    return urlMatch[0]
  }

  return null
}
