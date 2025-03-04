export function handleDomain(baseUrl: string) {
  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  return baseUrl;
}
