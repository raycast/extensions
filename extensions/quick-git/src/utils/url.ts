export function convertSSHtoHTTP(url: string): string {
  if (url.startsWith("https")) {
    return url;
  }

  const matches = url.match(/^git@([^:]+):(.+?)(\.git)?$/);
  if (!matches || matches.length < 3) {
    return url;
  }

  return `https://${matches[1]}/${matches[2]}`;
}
