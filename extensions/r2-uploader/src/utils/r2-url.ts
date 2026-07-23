export function buildPublicUrl(
  key: string,
  { endpoint, bucketName, customDomain }: { endpoint: string; bucketName: string; customDomain?: string },
): string {
  if (customDomain) {
    const cleanDomain = customDomain.replace(/\/$/, "");
    return `${cleanDomain}/${key}`;
  }
  return `${endpoint}/${bucketName}/${key}`;
}
