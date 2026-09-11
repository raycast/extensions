/** Labels are 1-63 chars, and at least one dot is required — bare hostnames cannot receive mail. */
const DOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

/**
 * Accepts whatever the user has in hand — a bare domain, a full email address, or a
 * pasted URL — and reduces it to the domain that would actually receive the mail.
 */
export function normalizeDomain(input: string): string {
  let value = input.trim().toLowerCase();
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  const at = value.lastIndexOf("@");
  if (at >= 0) value = value.slice(at + 1);
  value = value.split(/[/?#]/)[0];
  value = value.replace(/^www\./, "");
  return value.replace(/\.$/, "");
}

export function isValidDomain(input: string): boolean {
  const domain = normalizeDomain(input);
  return domain.length > 0 && domain.length <= 253 && DOMAIN_PATTERN.test(domain);
}
