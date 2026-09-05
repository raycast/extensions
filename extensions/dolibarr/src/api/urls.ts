import { MODULE_PART, type DocumentKind } from "./types";

const CARD_PATH: Record<DocumentKind, string> = {
  proposal: "/comm/propal/card.php",
  invoice: "/compta/facture/card.php",
  order: "/commande/card.php",
};

function assertId(id: number): number {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid Dolibarr ID: ${id}`);
  }
  return id;
}

export function thirdpartyUrl(web: string, id: number): string {
  return `${web}/societe/card.php?id=${assertId(id)}`;
}

export function contactUrl(web: string, id: number): string {
  return `${web}/contact/card.php?id=${assertId(id)}`;
}

export function documentUrl(web: string, kind: DocumentKind, id: number): string {
  return `${web}${CARD_PATH[kind]}?id=${assertId(id)}`;
}

/**
 * Built from the reference alone. Dolibarr stores the PDF at <ref>/<ref>.pdf; if it was never
 * generated — common for drafts — the browser shows Dolibarr's own error page. That is the
 * deliberate trade-off for not sending an existence check per document.
 *
 * `attachment=0` makes Dolibarr serve the file inline so it opens in the browser's viewer instead
 * of landing in the downloads folder.
 */
export function documentPdfUrl(web: string, kind: DocumentKind, ref: string): string {
  const file = encodeURIComponent(`${ref}/${ref}.pdf`);
  return `${web}/document.php?modulepart=${MODULE_PART[kind]}&attachment=0&file=${file}&entity=1`;
}
