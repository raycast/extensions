import { useForm } from "@raycast/utils";
import { SetStateAction } from "react";
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

  const formConfig = {
    validation: formValidation(colorFields.count),
    initialValues,
    enableDrafts: !isEditing, // Disable drafts in nested forms (when editing)
  };

  const { handleSubmit, itemProps, reset, setValue } = useForm<PaletteFormFields>({
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
    ...formConfig,
  });

  return {
    form: { submit: handleSubmit, items: itemProps, reset, update: setValue },
  };
}
