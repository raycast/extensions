export function getHostname(url: string): string {
  return new URL(url).hostname;
}
