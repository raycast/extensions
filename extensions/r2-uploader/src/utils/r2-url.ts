function encodeKeyPath(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function buildPublicUrl(
  key: string,
  { endpoint, bucketName, customDomain }: { endpoint: string; bucketName: string; customDomain?: string },
): string {
  const encodedKey = encodeKeyPath(key);

  if (customDomain) {
    const cleanDomain = customDomain.replace(/\/$/, "");
    return `${cleanDomain}/${encodedKey}`;
  }
  return `${endpoint}/${bucketName}/${encodedKey}`;
}
