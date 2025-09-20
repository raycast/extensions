import { Action, Tool } from "@raycast/api";
import { editInstanceFields, FieldValuePair } from "../services/editService";

/**
 * Represents a field to be updated for an instance
 */
type FieldUpdate = {
  /**
   * The data name of the field (used as the identifier)
   */
  fieldDataName: string;
  /**
   * The display name of the field
   */
  fieldName: string;
  /**
   * The new value to set for this field (as JSON string for complex types)
   *
   * IMPORTANT: For input-datetime fields, DO NOT include a timestamp
   */
  value: string;
};

type Input = {
  /**
   * The entity data name of the instance to edit
   */
  entityDataName: string;
  /**
   * The ID of the instance to edit
   */
  instanceId: string;
  /**
   * The name of the entity (for display purposes)
   */
  entityName: string;
  /**
   * Array of field updates to apply to the instance
   */
  fieldUpdates: FieldUpdate[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Create info items from field updates
  const info = input.fieldUpdates.map((field) => {
    // Format field value for display
    let displayValue = field.value;

    // Try to parse JSON values to display them nicely
    try {
      const parsed = JSON.parse(field.value);

      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && typeof parsed[0] === "object" && "text" in parsed[0]) {
          // This is an array of UserData
          displayValue = parsed.map((user) => user.text).join(", ");
        } else {
          displayValue = parsed.join(", ");
        }
      } else if (typeof parsed === "object" && parsed !== null) {
        if ("text" in parsed) {
          // This is a UserData or datetime object
          displayValue = parsed.text;
        } else {
          displayValue = JSON.stringify(parsed);
        }
      } else if (typeof parsed === "boolean") {
        displayValue = parsed ? "Yes" : "No";
      } else if (parsed === null || parsed === undefined) {
        displayValue = "Not set";
      } else {
        displayValue = String(parsed);
      }
    } catch {
      // Not valid JSON, use as-is
    }

    return {
      name: field.fieldName,
      value: displayValue,
    };
  });

  // Add entity information as the first item
  info.unshift({
    name: "Entity",
    value: input.entityName,
  });

  // Add instance ID information
  info.push({
    name: "Instance ID",
    value: input.instanceId,
  });

  return {
    message: "Are you sure you want to update the following instance fields?",
    style: Action.Style.Regular,
    info,
  };
};

/**
 * Edits an instance in Origami
 */
export default async function tool(input: Input) {
  // Convert the field updates to the format expected by the API
  const fieldUpdates: FieldValuePair[] = input.fieldUpdates.map((field) => [field.fieldDataName, field.value]);

  const response = await editInstanceFields(input.entityDataName, input.instanceId, fieldUpdates);

  return response;
}
