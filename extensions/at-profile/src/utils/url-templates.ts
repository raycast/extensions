import { sanitizeProfileInput } from "./url-sanitize";

export function buildProfileUrl(urlTemplate: string, profile: string): string {
  // Sanitize profile input
  const sanitizedProfile = sanitizeProfileInput(profile);

  // Replace {profile} placeholder
  return urlTemplate.replace(/{profile}/g, sanitizedProfile);
}

export function validateUrlTemplate(template: string): boolean {
  return template.includes("{profile}");
}

export function extractDomainFromTemplate(urlTemplate: string): string {
  try {
    const url = new URL(urlTemplate.replace("{profile}", "example"));
    return url.hostname;
  } catch {
    return "";
  }
}
