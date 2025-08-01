import { useForm } from "@raycast/utils";
import { SetStateAction, useMemo, useState } from "react";
import { CLEAR_FORM_VALUES } from "../constants";
import { PaletteFormFields, UseFormColorsObject } from "../types";
import { formValidation } from "../utils/formValidation";
import { useFormSubmission } from "./useFormSubmission";

type UseFormPaletteProps = {
  colorFields: UseFormColorsObject;
  initialValues: PaletteFormFields;
  isEditing: boolean;
};

type UseFormPaletteReturn = {
  form: {
    submit: (values: PaletteFormFields) => boolean | void | Promise<boolean | void>;
    items: ReturnType<typeof useForm<PaletteFormFields>>["itemProps"];
    reset: (values: PaletteFormFields) => void;
    update: <K extends keyof PaletteFormFields>(id: K, value: SetStateAction<PaletteFormFields[K]>) => void;
  };
};

export function useFormPalette({ colorFields, initialValues, isEditing }: UseFormPaletteProps): UseFormPaletteReturn {
  const { submitPalette } = useFormSubmission();
  const [formValues, setFormValues] = useState<PaletteFormFields>(initialValues);

  const { handleSubmit, itemProps, reset, setValue } = useForm<PaletteFormFields>({
    initialValues,
    validation: formValidation(colorFields.count),
    async onSubmit(values) {
      await submitPalette({
        formValues: {
          ...values,
          ...(isEditing && initialValues?.editId ? { editId: initialValues.editId } : {}),
        },
        colorCount: colorFields.count,
        onSubmit: () => {
          colorFields.resetColors();
          reset(CLEAR_FORM_VALUES);
        },
        isNestedContext: isEditing,
      });
    },
  });

  /**
   * Fallback mechanism for when useForm fails to generate itemProps.
   *
   * Issue: After syncing with the main Raycast extensions repo, the useForm hook
   * from @raycast/utils started returning empty itemProps ({}), which breaks form
   * field binding and prevents color pre-population from organize-colors/generate-colors.
   *
   * Root cause: Likely a breaking change in Raycast API (@raycast/utils v1.19.1)
   * that changed how useForm generates itemProps, possibly related to configuration
   * validation or property handling.
   *
   * Solution: Detect when itemProps is empty and provide a manual fallback that
   * creates the essential props (id, value, onChange) needed for form field binding.
   * This ensures backward compatibility while maintaining full functionality.
   *
   * @see https://github.com/raycast/extensions - official examples still use same pattern
   */
  const fallbackItemProps = useMemo(() => {
    const props: Record<
      string,
      {
        id: string;
        value: string | string[];
        onChange: ((newValue: string) => void) | ((newValue: string[]) => void);
      }
    > = {};

    // Generate props for each field in initialValues
    Object.keys(initialValues).forEach((key) => {
      const isKeywordsField = key === "keywords";
      props[key] = {
        id: key,
        value: formValues[key as keyof PaletteFormFields] || (isKeywordsField ? [] : ""),
        onChange: isKeywordsField
          ? (newValue: string[]) => {
              setFormValues((prev) => ({ ...prev, [key]: newValue }));
            }
          : (newValue: string) => {
              setFormValues((prev) => ({ ...prev, [key]: newValue }));
            },
      };
    });

    // Generate props for dynamic color fields based on current colorFields.count
    for (let i = 1; i <= colorFields.count; i++) {
      const colorKey = `color${i}` as keyof PaletteFormFields;
      if (!props[colorKey]) {
        props[colorKey] = {
          id: colorKey,
          value: formValues[colorKey] || "",
          onChange: (newValue: string) => {
            setFormValues((prev) => ({ ...prev, [colorKey]: newValue }));
          },
        };
      }
    }

    return props as ReturnType<typeof useForm<PaletteFormFields>>["itemProps"];
  }, [formValues, initialValues, colorFields.count]);

  // Use fallback if itemProps is empty
  const effectiveItemProps = Object.keys(itemProps).length > 0 ? itemProps : fallbackItemProps;

  return {
    form: { submit: handleSubmit, items: effectiveItemProps, reset, update: setValue },
  };
}
