import { Field, FieldGroup, FilterOperator } from "../types";
import { getFieldPropertySuffix } from "./filters";

/**
 * Converts a string to title case (first letter of each word capitalized)
 * Used for case-insensitive matching in user-field types
 *
 * @private Internal helper function
 * @param value The string to convert to title case
 * @returns The string in title case format
 */
function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Safely extracts all fields from field groups in an instance
 *
 * @param fieldGroups The field groups to extract fields from
 * @returns An array of fields
 */
export function extractFieldsFromGroups(fieldGroups: FieldGroup[] | undefined): Field[] {
  if (!fieldGroups || !Array.isArray(fieldGroups)) {
    return [];
  }

  return fieldGroups.reduce<Field[]>((acc, group) => {
    if (!group || !group.fields_data || !Array.isArray(group.fields_data)) {
      return acc;
    }

    const fields = group.fields_data.reduce<Field[]>((fieldAcc, fieldArray) => {
      if (Array.isArray(fieldArray)) {
        return [...fieldAcc, ...fieldArray];
      }
      return fieldAcc;
    }, []);

    return [...acc, ...fields];
  }, []);
}

/**
 * Gets the adjusted field data name based on field type
 *
 * @param fieldDataName The original field data name
 * @param fieldTypeName The field type name
 * @returns The adjusted field data name with appropriate suffix
 */
export function getAdjustedFieldDataName(fieldDataName: string | null, fieldTypeName: string | null): string | null {
  if (!fieldDataName) return fieldDataName;

  const suffix = fieldTypeName && getFieldPropertySuffix(fieldTypeName);
  return suffix ? `${fieldDataName}.${suffix}` : fieldDataName;
}

/**
 * Creates a filter array for API requests based on field type, operator, and value
 *
 * @param fieldDataName The field data name to filter by
 * @param fieldTypeName The field type name
 * @param filterOperator The operator to use for filtering
 * @param filterValue The value to filter by
 * @returns A filter array for API requests or null if no filter should be applied
 */
export function createFilter(
  fieldDataName: string | null,
  fieldTypeName: string | null,
  filterOperator: FilterOperator | null,
  filterValue: string | string[] | number | null,
): Array<[string, string, string | number | string[] | boolean]> | null {
  if (!fieldDataName || !fieldTypeName || !filterOperator || filterValue === null || filterValue === "") {
    return null;
  }

  const adjustedFieldDataName = getAdjustedFieldDataName(fieldDataName, fieldTypeName);
  if (!adjustedFieldDataName) return null;

  if (filterOperator === "in" && fieldTypeName !== "assign-field" && fieldTypeName !== "user-field") {
    // For "in" operator, the value must be an array
    let valueArray: string[] = [];

    // Make it case insensitive by converting all values to lowercase
    if (Array.isArray(filterValue)) {
      valueArray = filterValue.map((val) => (typeof val === "string" ? val.toLowerCase() : String(val)));
    } else {
      valueArray = [typeof filterValue === "string" ? filterValue.toLowerCase() : String(filterValue)];
    }

    if (valueArray.length > 0) {
      return [[adjustedFieldDataName, "in", valueArray]];
    }
  } else if (fieldTypeName === "assign-field") {
    // For assign-field, we should use "like" operator with the direct value
    const stringValue = typeof filterValue === "string" ? filterValue : String(filterValue);
    return [[adjustedFieldDataName, "like", stringValue]];
  } else if (fieldTypeName === "user-field") {
    // For user-field, we should use "=" operator with proper case formatting
    let stringValue = typeof filterValue === "string" ? filterValue : String(filterValue);

    // Convert to title case for case-insensitive matching
    stringValue = toTitleCase(stringValue);

    return [[adjustedFieldDataName, "=", stringValue]];
  } else if (filterOperator === "=" && fieldTypeName === "input-datetime") {
    // For datetime fields, we use the timestamp value directly
    return [[adjustedFieldDataName, filterOperator, filterValue]];
  } else if (filterOperator === "=") {
    // For "=" operator, try to convert to number if it looks like one
    const numValue =
      !isNaN(Number(filterValue)) && typeof filterValue !== "boolean" ? Number(filterValue) : filterValue;
    return [[adjustedFieldDataName, filterOperator, numValue]];
  } else {
    // For "like" and other operators, the value is a string or number
    return [[adjustedFieldDataName, filterOperator, filterValue]];
  }

  return null;
}
