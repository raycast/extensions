import { CustomTemplate } from "@/hooks/useCustomTemplates";
import { CustomEntityInput, CustomEntityUpdate } from "@/types";
import { messages } from "@/locale/en/messages";
import { handleCreateUpdateOperation } from "@/forms/form-operations";
import { showFailureToast } from "@/utils/toast";

export interface TemplateEditFormValues {
  name: string;
  instructions: string;
  requirements: string;
  outputInstructions: string;
  icon: string;
}

/**
 * Converts form values to the new template structure
 * @param values Form values to convert
 * @returns Format data with metadata in new structure
 */
export const convertFormValuesToFormatData = (values: TemplateEditFormValues): CustomEntityInput<CustomTemplate> => {
  return {
    name: values.name.trim(),
    icon: values.icon?.trim() || "",
    sections: {
      instructions: values.instructions.trim(),
      requirements: values.requirements?.trim() || undefined,
      output: values.outputInstructions?.trim() || undefined,
    },
  };
};

/**
 * Validates the constructed template structure
 * @param formatData Converted format data to validate
 * @throws Error if template structure is invalid
 */
export const validateConvertedTemplate = (formatData: CustomEntityInput<CustomTemplate>): void => {
  if (!formatData.sections?.instructions || !formatData.sections.instructions.trim()) {
    throw new Error(messages.validation.templateForm.templateConversionFailed);
  }
};

/**
 * Handles form submission for format creation and updates
 * @param values Form values
 * @param format Current format (for editing) or empty format (for creation)
 * @param onCreate Function to create new format
 * @param onUpdate Function to update existing format
 * @param onSuccess Success callback
 * @returns Promise that resolves when operation completes
 */
export const handleFormSubmit = async (
  values: TemplateEditFormValues,
  format: CustomTemplate,
  onCreate: (formatData: CustomEntityInput<CustomTemplate>) => Promise<CustomTemplate>,
  onUpdate: (id: string, updates: CustomEntityUpdate<CustomTemplate>) => Promise<CustomTemplate | undefined>,
  onSuccess?: (createdFormat?: CustomTemplate) => void
): Promise<void> => {
  const isEditing = !!format?.id;

  try {
    // Validate template structure before conversion (inlined from helper)
    const errors: string[] = [];
    if (!values.instructions?.trim()) {
      errors.push(messages.validation.templateForm.instructionsRequired);
    }
    if (errors.length > 0) {
      throw new Error(errors[0]); // Throw first error
    }

    // Convert form values to new template structure
    const formatDataWithMetadata = convertFormValuesToFormatData(values);

    // Validate the constructed template structure
    validateConvertedTemplate(formatDataWithMetadata);

    const result = await handleCreateUpdateOperation({
      isEditing,
      itemName: values.name,
      createOperation: () => onCreate(formatDataWithMetadata),
      updateOperation: () => onUpdate(format.id, formatDataWithMetadata),
      messages: {
        createSuccessTitle: messages.toast.templateCreated,
        updateSuccessTitle: messages.toast.templateUpdated,
        createErrorTitle: messages.toast.templateCreateFailed,
        updateErrorTitle: messages.toast.templateUpdateFailed,
      },
    });

    if (result.success && onSuccess) {
      onSuccess(result.data || format);
    }
  } catch (error) {
    // Handle template conversion and validation errors specifically
    const errorMessage = error instanceof Error ? error.message : messages.validation.templateForm.processingFailed;
    const errorTitle = isEditing ? messages.toast.templateUpdateFailed : messages.toast.templateCreateFailed;

    showFailureToast(errorTitle, errorMessage);

    // Re-throw to prevent form submission
    throw error;
  }
};

/**
 * Creates initial form values from a format object
 * @param format Format to extract values from (can be undefined for creation)
 * @returns Initial form values
 */
export const createInitialFormValues = (format?: CustomTemplate): TemplateEditFormValues => {
  return {
    name: format?.name || "",
    instructions: format?.sections?.instructions || "",
    requirements: format?.sections?.requirements || "",
    outputInstructions: format?.sections?.output || "",
    icon: format?.icon || "",
  };
};
