export function extractSlug(token: string) {
  const payload = token.split(".")[1];
  const decodedPayload = Buffer.from(payload, "base64").toString();
  const parsedPayload = JSON.parse(decodedPayload);

  return parsedPayload.org_slug;
}
