// notifications.cttexpress.com -> cttexpress.com, mail.example.co.uk -> example.co.uk
export function registrableDomain(domain: string): string {
  const parts = domain.toLowerCase().split(".");
  const secondLevel = parts.length > 2 && parts.at(-1)!.length === 2 && parts.at(-2)!.length <= 3;
  return parts.slice(secondLevel ? -3 : -2).join(".");
}
