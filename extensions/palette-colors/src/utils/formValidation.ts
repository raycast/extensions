import { FormValidation } from "@raycast/utils";
import { DESCRIPTION_FIELD_MAXLENGTH, NAME_FIELD_MAXLENGTH } from "../constants";
import { isValidHexColor } from "./isValidHexColor";

/** Name: required, max NAME_FIELD_MAXLENGTH characters. */
export function validateName(value: string | undefined): string | undefined {
  if (!value) {
    return FormValidation.Required;
  }
  if (value.length > NAME_FIELD_MAXLENGTH) {
    return `Too long: ${value.length}/${NAME_FIELD_MAXLENGTH} characters`;
  }
}

/** Description: optional, max DESCRIPTION_FIELD_MAXLENGTH characters. */
export function validateDescription(value: string | undefined): string | undefined {
  if (value && value.length > DESCRIPTION_FIELD_MAXLENGTH) {
    return `Too long: ${value.length}/${DESCRIPTION_FIELD_MAXLENGTH} characters`;
  }
}

/** Creates validation rules for palette form fields. */
export function formValidation(colorCount: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rules: Record<string, any> = {
    name: validateName,
    /** Mode: required selection */
    mode: FormValidation.Required,
    description: validateDescription,
  };

  // Add validation for color fields
  Array.from({ length: colorCount }, (_, index) => {
    const colorKey = `color${index + 1}`;
    if (index === 0) {
      // First color: required and valid format
      rules[colorKey] = (value: string) => {
        if (!value) {
          return "At least one color is required";
        }
        if (!isValidHexColor(value)) {
          return "Please enter a valid HEX color (e.g., #FF5733 or #F57)";
        }
      };
    } else {
      // Additional colors: optional but must be valid if provided
      rules[colorKey] = (value: string) => {
        if (value && !isValidHexColor(value)) {
          return "Please enter a valid HEX color (e.g., #FF5733 or #F57)";
        }
      };
    }
  });

  return rules;
}
