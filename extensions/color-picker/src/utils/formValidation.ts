import { FormValidation } from "@raycast/utils";
import { isValidHexColor } from "./isValidHexColor";

/** Creates validation rules for palette form fields. */
export function formValidation(colorCount: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rules: Record<string, any> = {
    /** Name: required, max 30 characters */
    name: (value: string) => {
      if (!value) {
        return FormValidation.Required;
      }
      if (value.length > 30) {
        return "Limit exceeded: keep it under 30 characters";
      }
    },
    /** Mode: required selection */
    mode: FormValidation.Required,
    /** Description: optional, max 200 characters */
    description: (value: string) => {
      if (value && value.length > 200) {
        return "Limit exceeded: keep it under 200 characters";
      }
    },
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
