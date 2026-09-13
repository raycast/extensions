import type { Session, SessionListResponse } from "./types";

export interface FeedSnapshot {
  items: Session[];
  hasMore: boolean;
  nextOffset: number;
  pages: number;
}

function dedupe(sessions: Session[]): Session[] {
  const seen = new Set<string>();
  return sessions.filter((session) => {
    if (seen.has(session.id)) return false;
    seen.add(session.id);
    return true;
  });
}

/**
 * Substitui a janela mais nova por uma resposta de polling e preserva as páginas
 * antigas já carregadas. O offset do Hermes conta apenas linhas não fixadas.
 */
export function mergePolledFirstPage(current: FeedSnapshot, firstPage: SessionListResponse): FeedSnapshot {
  const first = dedupe(firstPage.data);

  // A snapshot is a concatenation of pages, while each response also back-fills
  // all pinned rows beyond the non-pinned limit. Reconstruct the IDs that made
  // up the old first page so an item removed from that page cannot leak into the
  // preserved tail when a newer item shifts up from the next page.
  const oldFirstPageIds = new Set<string>();
  if (current.pages > 1) {
    // Uma resposta sem `limit` utilizável não permite reconstruir a fronteira: cair para o
    // tamanho observado da página nova é o que preserva a remoção de itens antigos.
    const freshNonPinned = first.filter((session) => session.pinned !== true).length;
    const pageLimit = Number.isFinite(firstPage.limit) ? Math.max(0, firstPage.limit) : freshNonPinned;
    const seen = new Set<string>();
    let nonPinned = 0;
    for (const session of current.items) {
      if (seen.has(session.id)) continue;
      seen.add(session.id);
      if (session.pinned === true) oldFirstPageIds.add(session.id);
      else if (nonPinned < pageLimit) {
        oldFirstPageIds.add(session.id);
        nonPinned += 1;
      }
    }
  }

  // Quando só a primeira página estava carregada, qualquer item que sumiu da
  // resposta é stale e deve desaparecer. Com páginas adicionais, somente os
  // itens das páginas antigas (e não os da primeira página anterior) ficam na
  // cauda.
  const tail = current.pages > 1 ? current.items.filter((session) => !oldFirstPageIds.has(session.id)) : [];
  const items = dedupe([...first, ...tail]);

  return {
    items,
    // `has_more` da primeira página responde "existe mais depois da página 1", nunca "depois
    // da última página carregada". Com a cauda preservada ele só pode DERRUBAR o flag do feed:
    // ressuscitá-lo reexibiria "carregar mais" numa lista completa a cada ciclo de polling.
    hasMore: current.pages > 1 ? current.hasMore && firstPage.has_more === true : firstPage.has_more === true,
    nextOffset: items.filter((session) => session.pinned !== true).length,
    pages: current.pages,
  };
}
