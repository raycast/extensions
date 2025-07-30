export function cleanPemInput(pem: string): string {
  return pem
    .replace(/-----BEGIN CERTIFICATE-----/gi, "")
    .replace(/-----END CERTIFICATE-----/gi, "")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .trim();
}
