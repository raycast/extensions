export function formatCharCount(count: number): string {
  if (count < 1000) return `${count} chars`;
  if (count < 1000000)
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k chars`;
  return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M chars`;
}
