import type { RuntimeCompat } from "@/types";

export const generateSearchBody = (
  query: string,
  scope: string | null,
  runtimes: RuntimeCompat,
  limit = 50,
): string => {
  const whereClauses = Array<{ [key: string]: unknown }>();
  if (scope) {
    whereClauses.push({ scope: scope });
  }
  Object.entries(runtimes).forEach(([key, value]) => {
    if (value) {
      whereClauses.push({ [`runtimeCompat.${key}`]: true });
    }
  });
  const whereClause =
    whereClauses.length > 0 ? { where: whereClauses.reduce((acc, clause) => ({ ...acc, ...clause }), {}) } : {};
  const body = {
    term: query,
    limit,
    mode: "fulltext",
    boost: { id: 3, scope: 2, name: 1, description: 0.5 },
    ...whereClause,
  };
  return JSON.stringify(body);
};
