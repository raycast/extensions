export function stripUrl(url: string): string {
  // remove protocol
  url = url.replace(/^https?:\/\//, "");

  // keep only {domain}/{owner}/{repo}
  const match = url.match(/^[^/]+\/[^/]+\/[^/]+/);

  return match ? match[0] : url;
}
