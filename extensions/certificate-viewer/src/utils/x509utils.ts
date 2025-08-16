export function cleanPemInput(pem: string): string {
  return pem
    .replace(/-----BEGIN CERTIFICATE-----/gi, "")
    .replace(/-----END CERTIFICATE-----/gi, "")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .trim();
}

export function parsePemCertificates(pemInput: string): string[] {
  const certificates: string[] = [];
  const certRegex = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/gi;
  let match;

  while ((match = certRegex.exec(pemInput)) !== null) {
    certificates.push(match[0].trim());
  }

  return certificates;
}
