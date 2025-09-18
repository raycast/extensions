import { showFailureToast, showSuccessToast } from "@/utils/toast";
import { messages } from "@/locale/en/messages";

// Type Definitions

/**
 * Configuration for create/update operation messages
 */
interface OperationMessages {
  readonly createSuccessTitle: string;
  readonly updateSuccessTitle: string;
  readonly createErrorTitle: string;
  readonly updateErrorTitle: string;
}

/**
 * Result of a form operation
 */
type OperationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Configuration for field validation
 */
interface ValidationConfig {
  readonly isRequired?: boolean;
  readonly customValidator?: (value: string) => string | undefined;
}

// Form Operation Functions

/**
 * Reusable handler for create/update operations in forms.
 *
 * This utility standardizes the create/update flow for form operations,
 * providing consistent success/error handling and user feedback.
 *
 * @template T - The type of the item being created/updated
 * @param config - Configuration object containing operation details
 * @returns Promise<OperationResult<T>> - Result of the operation
 *
 * @example
 * ```typescript
 * const result = await handleCreateUpdateOperation({
 *   isEditing,
 *   itemName: values.name,
 *   createOperation: () => addTemplate(values),
 *   updateOperation: () => updateTemplate(template.id, values),
 *   messages: {
 *     createSuccessTitle: "Template Created",
 *     updateSuccessTitle: "Template Updated",
 *     createErrorTitle: "Failed to Create Template",
 *     updateErrorTitle: "Failed to Update Template"
 *   }
 * });
 *
 * if (result.success) {
 *   onSuccess(result.data);
 * }
 * ```
 */
export async function handleCreateUpdateOperation<T>(config: {
  readonly isEditing: boolean;
  readonly itemName: string;
  readonly createOperation: () => Promise<T>;
  readonly updateOperation: () => Promise<T>;
  readonly messages: OperationMessages;
}): Promise<OperationResult<T>> {
  const { isEditing, itemName, createOperation, updateOperation, messages } = config;

  try {
    const result = isEditing ? await updateOperation() : await createOperation();

    const successTitle = isEditing ? messages.updateSuccessTitle : messages.createSuccessTitle;
    const successMessage = `Successfully ${isEditing ? "updated" : "created"} "${itemName}"`;

    showSuccessToast(successTitle, successMessage);

    return { success: true, data: result };
  } catch (error) {
    const errorTitle = isEditing ? messages.updateErrorTitle : messages.createErrorTitle;
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

    showFailureToast(errorTitle, errorMessage);

    return { success: false, error: errorMessage };
  }
}

/**
 * Utility for generating form validation rules.
 *
 * This utility provides a flexible way to create validation functions for form fields,
 * supporting both required field validation and custom validation logic.
 *
 * @param config - Validation configuration
 * @returns Validation function or undefined if no validation needed
 *
 * @example
 * ```typescript
 * const nameValidation = createFieldValidation({ isRequired: true });
 * const emailValidation = createFieldValidation({
 *   isRequired: true,
 *   customValidator: (value) => {
 *     if (!value.includes('@')) return 'Invalid email format';
 *   }
 * });
 * ```
 */
export function createFieldValidation(
  config: ValidationConfig = {}
): ((value: string) => string | undefined) | undefined {
  const { isRequired = true, customValidator } = config;

  // No validation needed if not required and no custom validator
  if (!isRequired && !customValidator) {
    return undefined;
  }

  return (value: string): string | undefined => {
    // Check required field first
    if (isRequired && !value?.trim()) {
      return messages.generic.requiredField;
    }

    // Apply custom validation if provided
    return customValidator?.(value);
  };
}

// Export types for use in other modules
export type { OperationResult, OperationMessages, ValidationConfig };
