export const formatSummary = (summary?: string) =>
  summary
    ?.split(/\r?\n/)
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("") || "No summary available."

export const getImageUrl = (url?: string) => {
  if (!url) return undefined
  return url.replace(/^http:\/\//i, "https://")
}
