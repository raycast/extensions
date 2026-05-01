const MUTATING_PATTERN =
  /^\s*(?:WITH\s+[\s\S]+?\)\s*)?(?:INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|MERGE|CREATE|REPLACE|GRANT|REVOKE)\b/i;

export function isMutatingSQL(sql: string): boolean {
  if (!sql) return false;
  return MUTATING_PATTERN.test(sql);
}

export function summarizeSQL(sql: string, max = 240): string {
  const cleaned = sql.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1) + "…";
}
