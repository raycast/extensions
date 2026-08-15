export function addLimitIfNeeded(query: string, defaultLimit: number = 20): string {
  const trimmed = query.trim();
  const upper = trimmed.toUpperCase();

  if (upper.includes("LIMIT") || !upper.startsWith("SELECT")) {
    return trimmed;
  }

  const base = trimmed.endsWith(";") ? trimmed.slice(0, -1) : trimmed;
  return `${base} LIMIT ${defaultLimit};`;
}

export function formatQueryForDisplay(query: string, maxLength: number = 100): string {
  const normalized = query.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : normalized.substring(0, maxLength) + "...";
}

export function isValidConnectionString(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    return url.protocol === "postgresql:" || url.protocol === "postgres:";
  } catch {
    return false;
  }
}

export function formatExecutionTime(ms: number): string {
  return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

export function getRowIdentifier(row: Record<string, unknown>, fields?: { name: string }[]): string {
  const idColumns = ["id", "uuid", "pk", "_id"];

  if (fields) {
    for (const idCol of idColumns) {
      const field = fields.find((f) => f.name.toLowerCase() === idCol);
      if (field && row[field.name] != null) {
        return String(row[field.name]);
      }
    }
    const first = fields[0];
    if (first && row[first.name] != null) {
      return String(row[first.name]);
    }
  } else {
    for (const idCol of idColumns) {
      if (row[idCol] != null) return String(row[idCol]);
    }
    const firstValue = Object.values(row)[0];
    if (firstValue != null) return String(firstValue);
  }

  return "Row";
}

export function formatValue(value: unknown): string {
  if (value == null) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
