import {
  AddressFieldValue,
  DateTimeFieldValue,
  DefaultFieldValue,
  FieldValue,
  UploadFilesFieldValue,
  UserFieldValue,
} from "../types";

/**
 * Gets display text from a field value.
 * Handles different field value types and formats them appropriately.
 *
 * @param value The field value.
 * @param defaultValue The default value to use if the field value is undefined.
 * @returns The formatted display text.
 */
export function getDisplayText(
  value:
    | string
    | number
    | readonly FieldValue[]
    | AddressFieldValue
    | UploadFilesFieldValue
    | UserFieldValue
    | DateTimeFieldValue
    | undefined,
  defaultValue: string | number | DefaultFieldValue,
): string {
  if (value === undefined || value === null || value === "") {
    if (typeof defaultValue === "object" && "text" in defaultValue) {
      return defaultValue.text || "";
    }
    return String(defaultValue || "");
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "";
    }

    return value
      .map((val) => {
        if (typeof val === "string" || typeof val === "number") {
          return String(val);
        }
        return val.text;
      })
      .join(", ");
  }

  // Handle user-field type
  if ("text" in value && "instance_id" in value && "ref_value" in value) {
    return value.text;
  }

  // Handle input-datetime field type
  if ("text" in value && "timestamp" in value) {
    return value.text;
  }

  // Handle address-field type
  if ("formatted_address" in value) {
    return value.formatted_address;
  }

  // Handle upload-files field type
  if ("file_name" in value) {
    return value.file_name;
  }

  return JSON.stringify(value);
}
