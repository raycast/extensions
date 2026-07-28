import { getDomain, getPublicSuffix } from "tldts";

export function getRegistrableDomain(hostname: string): string | null {
  return getDomain(hostname, { allowPrivateDomains: true }) || null;
}

export function parseSender(fromHeader: string | undefined): { name: string; email: string } {
  if (!fromHeader) {
    return { name: "", email: "" };
  }

  const emailMatch = fromHeader.match(/<([^>]+)>/);
  if (emailMatch) {
    const name = fromHeader
      .replace(/<[^>]+>/, "")
      .trim()
      .replace(/^"|"$/g, "");
    return { name, email: emailMatch[1].toLowerCase().trim() };
  }

  if (/^[^\s<>]+@[^\s<>]+$/.test(fromHeader.trim())) {
    return { name: "", email: fromHeader.trim().toLowerCase() };
  }

  return { name: fromHeader.trim(), email: "" };
}

export function getRegistrableDomainForEmail(email: string): string | null {
  const domain = email.split("@")[1];
  if (!domain) return null;
  return getRegistrableDomain(domain);
}

export function isValidPublicSuffix(hostname: string): boolean {
  return getPublicSuffix(hostname) !== null;
}
