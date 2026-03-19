export function buildPublicUrl(publicBaseUrl: string, objectKey: string): string {
  const base = publicBaseUrl.replace(/\/+$/g, "");
  const normalizedKey = objectKey.replace(/^\/+/g, "");
  const encodedKey = normalizedKey
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${base}/${encodedKey}`;
}
