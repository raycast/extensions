const escapeLike = (term: string) => term.replace(/'/g, "''").replace(/[\\%_]/g, "\\$&");

export const titleLikeClauses = (tableTitle: string, terms: string[]) => {
  return terms.map((t) => `${tableTitle}.title LIKE '%${escapeLike(t)}%' ESCAPE '\\'`).join(" AND ");
};
