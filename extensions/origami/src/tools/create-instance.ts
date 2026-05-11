import { Action, Tool } from "@raycast/api";
import { createInstance, FieldData, FormData, getUsers, UserData } from "../services/instanceService";

/**
 * Type for a field within a field group
 */
type Field = {
  /**
   * The data name of the field (used as the identifier)
   */
  fieldDataName: string;
  /**
   * The display name of the field
   */
  fieldName: string;
  /**
   * The value to set for this field (as JSON string for complex types)
   */
  value: string;
  /**
   * The type of the field (e.g., "input-text", "select-list", etc.)
   */
  fieldType: string;
};

/**
 * Type for a field group
 */
type FieldGroup = {
  /**
   * The data name of the group (used as the identifier)
   */
  groupDataName: string;
  /**
   * The display name of the group
   */
  groupName: string;
  /**
   * The fields belonging to this group
   */
  fields: Field[];
};

type Input = {
  /**
   * The entity data name where the instance will be created
   */
  entityDataName: string;
  /**
   * The display name of the entity
   */
  entityName: string;
  /**
   * Array of field groups with their fields and values
   */
  fieldGroups: FieldGroup[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Create info items from field groups and their fields
  const info: { name: string; value: string }[] = [];

  // Add entity information as the first item
  info.push({
    name: "Entity",
    value: input.entityName,
  });

  // Add all field values, grouped by their group
  for (const group of input.fieldGroups) {
    for (const field of group.fields) {
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

      info.push({
        name: `${group.groupName}: ${field.fieldName}`,
        value: displayValue,
      });
    }
  }

  return {
    message: "Are you sure you want to create this instance?",
    style: Action.Style.Regular,
    info,
  };
};

/**
 * Creates a new instance in Origami
 */
export default async function tool(input: Input) {
  // First, fetch the list of available users
  const users = await getUsers();

  // Convert input format to the format expected by the createInstance function
  const formData: FormData[] = input.fieldGroups.map((group) => {
    const fieldValues: FieldData = {};

    // Process each field in the group
    group.fields.forEach((field) => {
      if (!field.value) return;

      // Format field value based on field type
      if (field.fieldType === "assign-field" || field.fieldType === "user-field") {
        // For user fields, find the user by name first
        try {
          const parsedValue = JSON.parse(field.value);

          // Handle array of user names for assign-field
          if (Array.isArray(parsedValue) && field.fieldType === "assign-field") {
            // Array of user names, look up each one
            const userObjects = parsedValue
              .map((name) => users.find((u) => u.text === name))
              .filter((user): user is UserData => user !== undefined);

            if (userObjects.length > 0) {
              fieldValues[field.fieldDataName] = userObjects;
            }
          }
          // Handle single user name (for both field types)
          else if (typeof parsedValue === "string") {
            const user = users.find((u) => u.text === parsedValue);
            if (user) {
              // For assign-field, wrap in array; for user-field, use directly
              fieldValues[field.fieldDataName] = field.fieldType === "assign-field" ? [user] : user;
            }
          }
        } catch {
          // Not valid JSON, try as a plain string
          const userName = field.value.trim();
          const user = users.find((u) => u.text === userName);
          if (user) {
            fieldValues[field.fieldDataName] = field.fieldType === "assign-field" ? [user] : user;
          }
        }
      } else {
        // Handle other field types
        try {
          const parsedValue = JSON.parse(field.value);
          fieldValues[field.fieldDataName] = parsedValue;
        } catch {
          fieldValues[field.fieldDataName] = field.value;
        }
      }
    });

    return {
      group_data_name: group.groupDataName,
      data: [fieldValues],
    };
  });

  // Filter out any empty groups (groups with no fields that have values)
  const filteredFormData = formData.filter((group) => Object.keys(group.data[0]).length > 0);

  const response = await createInstance(input.entityDataName, filteredFormData);

  return response;
}
