type SerializableValue = string | number | boolean | null | SerializableValue[] | { [key: string]: SerializableValue };

function normalizeValue(value: unknown): SerializableValue | undefined {
  if (value === null) {
    return null;
  }

  const valueType = typeof value;
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return value as string | number | boolean;
  }

  if (valueType === "undefined" || valueType === "function" || valueType === "symbol") {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry) ?? null);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (valueType === "object") {
    const normalizedObject: Record<string, SerializableValue> = {};
    const entries = Object.entries(value as Record<string, unknown>).sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey),
    );

    for (const [key, entry] of entries) {
      const normalizedEntry = normalizeValue(entry);
      if (normalizedEntry !== undefined) {
        normalizedObject[key] = normalizedEntry;
      }
    }

    return normalizedObject;
  }

  return undefined;
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(normalizeValue(value) ?? null);
}

export function stableDeserialize<T>(serialized: string): T {
  return JSON.parse(serialized) as T;
}
