export function getLinearAppUrl(webUrl: string): string {
  return webUrl.replace(/^https:\/\/linear\.app\//, "linear://");
}
