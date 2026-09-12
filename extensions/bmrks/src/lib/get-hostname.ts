export function getHostname(url: string) {
  return url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split("/")[0];
}
