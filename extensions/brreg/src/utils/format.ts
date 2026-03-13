import type { Enhet } from "../types";

export function formatAddress(addr?: Enhet["forretningsadresse"]): string {
  if (!addr) {
    return "";
  }
  const street = addr.adresse?.join(", ") ?? "";
  const post = [addr.postnummer, addr.poststed].filter(Boolean).join(" ");
  const country = addr.land ?? "Norge";

  return [street, post, country].filter(Boolean).join(", ");
}
