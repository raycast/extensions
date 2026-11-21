export function displayHost(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

export function markdownLink(title: string, url: string): string {
  const escapedTitle = title.replace(/([\\[\]])/g, "\\$1");
  return `[${escapedTitle}](${url})`;
}
