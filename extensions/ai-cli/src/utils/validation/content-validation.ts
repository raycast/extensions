import { ValidatedInput, ValidationResult } from "../../types";
import { createTimestamp } from "../entity-operations";
import { createValidatedInput, isValidatedInput } from "../type-guards";
import { INPUT_LIMITS } from "@/constants";
import { messages } from "@/locale/en/messages";
import { formatValidationError } from "../message-formatting";

/**
 * Content validation utilities for clipboard text and variant counts.
 */
function safeCreateValidatedInput(value: unknown): ValidatedInput<string> | null {
  if (!isValidatedInput(value)) return null;
  try {
    return createValidatedInput(value);
  } catch {
    return null;
  }
}

export function validateClipboardContent(text: string | null): ValidationResult<ValidatedInput<string>> {
  const timestamp = createTimestamp();

  if (!text || text.trim().length === 0) {
    return {
      isValid: false,
      success: false,
      errors: [messages.validation.emptyClipboard],
      warnings: [],
      timestamp,
    };
  }

  const maxLength = INPUT_LIMITS.MAX_TEXT_LENGTH;

  if (text.length > maxLength) {
    return {
      isValid: false,
      success: false,
      errors: [
        formatValidationError(messages.validation.textTooLong, {
          length: text.length,
          maxLength: maxLength,
        }),
      ],
      warnings: [],
      timestamp,
    };
  }

  const validatedInput = safeCreateValidatedInput(text);
  if (!validatedInput) {
    return {
      isValid: false,
      success: false,
      errors: [messages.validation.invalidInput],
      warnings: [],
      timestamp,
    };
  }

  return {
    isValid: true,
    success: true,
    data: validatedInput,
    errors: [],
    warnings: [],
    timestamp,
  };
}

// Removed variant count parsing; single-variant generation enforced across the app
