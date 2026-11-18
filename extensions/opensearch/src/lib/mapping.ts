export interface MappingField {
  field: string;
  type: string;
}

interface MappingProperty {
  type?: string;
  properties?: Record<string, MappingProperty>;
  fields?: Record<string, MappingProperty>;
}

function flattenProperties(properties: Record<string, MappingProperty>, prefix = ""): MappingField[] {
  const fields: MappingField[] = [];
  for (const [name, property] of Object.entries(properties)) {
    const path = prefix ? `${prefix}.${name}` : name;
    if (property.properties) {
      // object / nested field
      fields.push(...flattenProperties(property.properties, path));
    } else {
      fields.push({ field: path, type: property.type ?? "object" });
    }
  }
  return fields;
}

/**
 * Flattens the payload of `GET /{index}/_mapping` into a flat list of fields.
 * The response is keyed by index name, so we merge the properties of every index found.
 */
export function flattenMapping(mapping: unknown): MappingField[] {
  if (!mapping || typeof mapping !== "object") return [];
  const byField = new Map<string, MappingField>();

  for (const index of Object.values(
    mapping as Record<string, { mappings?: { properties?: Record<string, MappingProperty> } }>,
  )) {
    const properties = index?.mappings?.properties;
    if (!properties) continue;
    for (const field of flattenProperties(properties)) {
      byField.set(field.field, field);
    }
  }

  return [...byField.values()].sort((a, b) => a.field.localeCompare(b.field));
}
