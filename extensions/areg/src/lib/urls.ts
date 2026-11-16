import { AREG_URL } from "./constants";

export type CompanyPage =
  | "shareholders"
  | "holdings"
  | "history"
  | "roles"
  | "financials"
  | "konsern"
  | "announcements"
  | "grants"
  | "tenders"
  | "rettigheter"
  | "loyver"
  | "konsesjoner";

export function companyUrl(orgnr: string, page?: CompanyPage): string {
  return page ? `${AREG_URL}/${orgnr}/${page}` : `${AREG_URL}/${orgnr}`;
}

export function brregUrl(orgnr: string): string {
  return `https://virksomhet.brreg.no/nb/oppslag/enheter/${orgnr}`;
}

export function personPath(name: string, born: number): string {
  return `/people?${new URLSearchParams({ name, born: String(born) })}`;
}

export function personUrl(name: string, born: number): string {
  return `${AREG_URL}${personPath(name, born)}`;
}
