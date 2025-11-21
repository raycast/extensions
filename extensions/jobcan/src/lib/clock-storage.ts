import { LocalStorage } from "@raycast/api";
import { ClockField } from "./clock-fields";
import { generateFieldSchema } from "./clock-fields";
import { STORAGE_KEYS } from "./constants";

/**
 * Get stored field schema
 */
export async function getStoredFieldSchema(): Promise<string | null> {
  const result = await LocalStorage.getItem<string>(STORAGE_KEYS.CLOCK_FIELDS_SCHEMA);
  return result ?? null;
}

/**
 * Store field schema
 */
export async function setStoredFieldSchema(schema: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.CLOCK_FIELDS_SCHEMA, schema);
}

/**
 * Check if field schema has changed
 */
export function hasFieldSchemaChanged(detectedFields: ClockField[], storedSchema: string | null): boolean {
  if (!storedSchema) {
    return true; // No stored schema means first run or schema was cleared
  }

  const currentSchema = generateFieldSchema(detectedFields);
  return currentSchema !== storedSchema;
}

/**
 * Set remembered field value
 */
export async function setRememberedFieldValue(fieldName: string, value: string): Promise<void> {
  const key = `${STORAGE_KEYS.CLOCK_FIELD_VALUE_PREFIX}${fieldName}`;
  await LocalStorage.setItem(key, value);
}

/**
 * Clear a specific field's stored value
 */
export async function clearFieldValue(fieldName: string): Promise<void> {
  const key = `${STORAGE_KEYS.CLOCK_FIELD_VALUE_PREFIX}${fieldName}`;
  await LocalStorage.removeItem(key);
}

/**
 * Get all remembered field values as a map
 */
export async function getAllRememberedFieldValues(): Promise<Record<string, string>> {
  const allItems = await LocalStorage.allItems();
  const values: Record<string, string> = {};

  for (const [key, value] of Object.entries(allItems)) {
    if (key.startsWith(STORAGE_KEYS.CLOCK_FIELD_VALUE_PREFIX)) {
      const fieldName = key.replace(STORAGE_KEYS.CLOCK_FIELD_VALUE_PREFIX, "");
      values[fieldName] = value as string;
    }
  }

  return values;
}
