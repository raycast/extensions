import { Form, Icon } from "@raycast/api";
import { FormColorsFields } from "./components/FormColorsFields";
import { FormKeywordsFields } from "./components/FormKeywordsFields";
import { SavePaletteActions } from "./components/SavePaletteActions";
import { DESCRIPTION_FIELD_MAXLENGTH, NAME_FIELD_MAXLENGTH } from "./constants";
import { useFormActions } from "./hooks/useFormActions";
import { useFormColors } from "./hooks/useFormColors";
import { useFormFocus } from "./hooks/useFormFocus";
import { useFormKeywords } from "./hooks/useFormKeywords";
import { useFormPalette } from "./hooks/useFormPalette";
import { useFormSetup } from "./hooks/useFormSetup";
import { useKeywordsInput } from "./hooks/useKeywordsInput";
import { SavePaletteFormProps } from "./types";
import { withFocus, withLiveValidation } from "./utils/fieldProps";
import { validateDescription, validateName } from "./utils/formValidation";

export default function SaveColorPalette(props: SavePaletteFormProps) {
  const { draftValues, launchContext = {}, onPaletteUpdated } = props;

  // Check if we're in editing mode (nested context)
  const isEditing = Boolean(draftValues?.editId);

  const { initialValues } = useFormSetup({ draftValues, launchContext });
  const { colorFields } = useFormColors(initialValues);
  const { keywords } = useFormKeywords();
  const { focus } = useFormFocus();
  const { form } = useFormPalette({ colorFields, initialValues, isEditing, onPaletteUpdated });
  const { formActions } = useFormActions({
    colorFields,
    form,
    focus,
    keywords,
  });
  const { keywordsInput } = useKeywordsInput(formActions.updateKeywords);
  const setError = (id: string, error: string | undefined) => form.setError(id as keyof typeof form.items, error);

  return (
    <Form
      actions={
        <SavePaletteActions
          form={form}
          formActions={formActions}
          colorFields={colorFields}
          focus={focus}
          keywordsInput={keywordsInput}
        />
      }
      enableDrafts={!isEditing}
    >
      <Form.Description text={isEditing ? "Edit Color Palette" : "Save Color Palette"} />
      <Form.TextField
        {...withLiveValidation(withFocus(form.items.name, focus.create("name")), validateName, setError)}
        title="Name*"
        placeholder="e.g., Sunset Warm"
        info={`Insert the name of your Color Palette (max ${NAME_FIELD_MAXLENGTH} characters)`}
      />
      <Form.TextArea
        {...withLiveValidation(
          withFocus(form.items.description, focus.create("description")),
          validateDescription,
          setError,
        )}
        title="Description"
        info={`Insert a short description (optional, max ${DESCRIPTION_FIELD_MAXLENGTH} characters).`}
      />
      <Form.Dropdown {...withFocus(form.items.mode, focus.create("mode"))} title="Mode*">
        <Form.Dropdown.Item value="light" title="Light Color Palette" icon={Icon.Sun} />
        <Form.Dropdown.Item value="dark" title="Dark Color Palette" icon={Icon.Moon} />
      </Form.Dropdown>
      <FormKeywordsFields
        data={{ keywords: keywords.keywords }}
        form={{ keywordProps: form.items.keywords }}
        keywordsInput={keywordsInput}
        focus={focus.create}
      />
      <FormColorsFields
        data={{ colorCount: colorFields.count }}
        form={{ colors: form.colors }}
        focus={{
          currentField: focus.currentField,
          create: focus.create,
        }}
      />
    </Form>
  );
}
