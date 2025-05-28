export function getLastStr(url: string) {
  const lastSlashIndex = url.lastIndexOf("/");
  if (lastSlashIndex === -1) {
    return "";
  }
  return url.substring(lastSlashIndex + 1);
}
