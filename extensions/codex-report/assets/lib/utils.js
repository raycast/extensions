export function parseDate(value, { endOfDay = false } = {}) {
  if (value == null || value === "" || value === "null" || value === "none") {
    return null;
  }

  if (value.includes("T")) {
    const normalized = value.endsWith("Z") ? value : value;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${value}`);
    }
    return date;
  }

  const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
}

export function parseTimestamp(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function localDay(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function label(value) {
  if (value == null) {
    return "(unknown)";
  }
  if (["string", "number", "boolean"].includes(typeof value)) {
    return String(value);
  }
  return JSON.stringify(value, Object.keys(value).sort());
}

export function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

export function sumMapValues(map) {
  return [...map.values()].reduce((sum, value) => sum + value, 0);
}

export function mapEntries(map) {
  return [...(map ?? new Map()).entries()];
}

export function mapFromEntries(entries) {
  return new Map(entries ?? []);
}
