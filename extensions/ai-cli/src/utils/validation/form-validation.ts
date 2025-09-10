import { FormValues } from "@/types";
import { messages } from "@/locale/en/messages";
import { MANAGEMENT_CONFIG } from "@/constants";

/**
 * Validates form values for text formatting requests.
 * Returns specific error message if validation fails, undefined if valid.
 */
export function validateFormValues(values: FormValues): string | undefined {
  // Validate text input (required)
  if (!values.textInput?.trim()) {
    return messages.validation.emptyText;
  }

  // Validate format selection (should not be management command)
  if (!values.template || values.template.startsWith(MANAGEMENT_CONFIG.MANAGE_PREFIX)) {
    return messages.validation.templateRequired;
  }

  // Validate tone selection (should not be management command)
  if (!values.tone || values.tone.startsWith(MANAGEMENT_CONFIG.MANAGE_PREFIX)) {
    return messages.validation.toneRequired;
  }

  // Validate model selection (should not be management command)
  if (!values.model || values.model.startsWith(MANAGEMENT_CONFIG.MANAGE_PREFIX)) {
    return messages.validation.modelRequired;
  }

  // All validation passed
  return undefined;
}
