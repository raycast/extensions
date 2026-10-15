// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
/**
 * Matching tra gli URL salvati in un item e l'URL della pagina corrente.
 *
 * Regola (ARCHITECTURE.md §8): si confronta il dominio registrabile eTLD+1
 * (es. `accounts.google.com` ↔ `google.com`) usando la Public Suffix List
 * tramite `tldts`. I domini "privati" della PSL (github.io, herokuapp.com...)
 * sono trattati come suffissi: `a.github.io` NON combacia con `b.github.io`.
 * Per host senza suffisso pubblico (localhost, IP, intranet) si confronta
 * l'hostname completo.
 */
import { getDomain, getHostname } from "tldts";

const TLDTS_OPTS = { allowPrivateDomains: true } as const;

/** Aggiunge `https://` se l'URL è privo di schema (gli utenti scrivono spesso solo `github.com`). */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Chiave di confronto di un URL: eTLD+1 se disponibile, altrimenti hostname.
 * Restituisce `null` per URL non analizzabili o schemi non web
 * (chrome://, about:, file:, javascript:...).
 */
export function urlMatchKey(input: string): string | null {
  const url = normalizeUrl(input);
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const hostname = getHostname(url, TLDTS_OPTS) ?? parsed.hostname.toLowerCase();
  if (!hostname) return null;
  const domain = getDomain(url, TLDTS_OPTS);
  return (domain ?? hostname).toLowerCase();
}

function isPlainHttp(input: string): boolean {
  try {
    return new URL(normalizeUrl(input)).protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * True se almeno uno degli URL dell'item appartiene allo stesso eTLD+1 della pagina.
 * Una pagina `http://` combacia SOLO con URL salvati esplicitamente come `http://`
 * (niente downgrade: una credenziale salvata per https://x.com non va offerta su http://x.com).
 */
export function matchUrl(itemUrls: readonly string[], pageUrl: string): boolean {
  const pageKey = urlMatchKey(pageUrl);
  if (!pageKey) return false;
  const pageIsHttp = isPlainHttp(pageUrl);
  return itemUrls.some((u) => urlMatchKey(u) === pageKey && (!pageIsHttp || isPlainHttp(u)));
}

/** Etichetta leggibile (hostname) per la UI, es. "github.com". */
export function displayHost(input: string): string {
  const url = normalizeUrl(input);
  try {
    return new URL(url).hostname;
  } catch {
    return input;
  }
}
