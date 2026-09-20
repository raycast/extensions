/**
 * Builds the Realm query sentence Paperlib's paperService.load() expects.
 * Mirrors PaperFilterOptions in app/renderer/services/paper-service.ts.
 */
export function buildPaperlibQuery(search: string): string {
  const filters: string[] = [];
  const formatted = formatSearch(search);

  if (formatted) {
    const fuzzy = `*${formatted.split(/\s+/).join("*")}*`;
    const escaped = escapeRealmString(fuzzy);
    filters.push(
      `(title LIKE[c] "${escaped}" OR authors LIKE[c] "${escaped}" OR publication LIKE[c] "${escaped}" OR note LIKE[c] "${escaped}")`,
    );
  }

  return filters.join(" AND ");
}

export function matchesLocalSearch(haystacks: string[], search: string): boolean {
  const tokens = formatSearch(search).toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return true;
  }
  const blob = haystacks.join(" ").toLowerCase();
  return tokens.every((token) => blob.includes(token));
}

function formatSearch(search: string): string {
  return search.replace(/\n/g, " ").trim();
}

function escapeRealmString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
