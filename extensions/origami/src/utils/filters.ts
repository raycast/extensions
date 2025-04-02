import { FilterOperator } from "../types";

/**
 * Gets the appropriate filter operator for a field type
 *
 * @param fieldTypeName
 * @returns The appropriate filter operator or null if the field type is not supported
 */
export function getFilterOperator(fieldTypeName: string): FilterOperator | null {
  const operatorMap: Record<string, FilterOperator> = {
    "api-field": "in",
    "assign-field": "like",
    "hidden-field": "like",
    "input-area": "like",
    "input-checkbox-singel": "in",
    "input-datetime": "=",
    "input-email": "like",
    "input-link": "like",
    "input-telephone": "like",
    "input-text": "like",
    "metadata-field": "=",
    "multi-select-from-entity": "in",
    "multi-value-free-type": "in",
    "multi-value-select-box": "in",
    "readonly-text": "like",
    "select-from-numbers-range": "=",
    "select-list": "in",
    "slider-selector": "=",
    "upload-files": "like",
    "user-field": "=",
  };

  return operatorMap[fieldTypeName] || null;
}

/**
 * Gets the property suffix to append to field data name based on field type
 *
 * @param fieldTypeName The type of field
 * @returns The property suffix to append or null if no suffix is needed
 */
export function getFieldPropertySuffix(fieldTypeName: string): string | null {
  const suffixMap: Record<string, string> = {
    "assign-field": "text",
    "upload-files": "file_name",
    "user-field": "text",
  };

  return suffixMap[fieldTypeName] || null;
}
