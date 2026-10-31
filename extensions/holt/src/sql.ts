// Same rules as Store::search in holt-core: every word must appear, pinned first,
// then newest. useSQL takes no bound parameters, so words are escaped into literals.
export function searchSQL(query: string) {
  const words = query
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ` AND text LIKE '%${w.replace(/[\\%_]/g, "\\$&").replace(/'/g, "''")}%' ESCAPE '\\'`);
  // copied_on is only worth showing when another device copied it, and peers lists the other devices.
  return `SELECT id, kind, text, source_app, created_at, pinned,
            CASE WHEN copied_by IN (SELECT id FROM peers) THEN copied_on END AS device
          FROM clips WHERE deleted = 0${words.join("")}
          ORDER BY pinned DESC, created_at DESC LIMIT 200`;
}
