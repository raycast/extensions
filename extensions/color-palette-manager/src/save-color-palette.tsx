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
import { SavePaletteFormProps } from "./types";

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

  return (
    <Form
      actions={<SavePaletteActions form={form} formActions={formActions} colorFields={colorFields} focus={focus} />}
      enableDrafts={!isEditing}
    >
      <Form.Description text={isEditing ? "Edit Color Palette" : "Create Color Palette"} />
      <Form.TextField
        {...form.items.name}
        title="Name*"
        info={`Insert the name of your Color Palette (max ${NAME_FIELD_MAXLENGTH} characters)`}
        {...focus.create("name")}
      />
      <Form.TextArea
        {...form.items.description}
        title="Description"
        info={`Insert a short description (optional, max ${DESCRIPTION_FIELD_MAXLENGTH} characters).`}
        {...focus.create("description")}
      />
      <Form.Dropdown {...form.items.mode} title="Mode*" {...focus.create("mode")}>
        <Form.Dropdown.Item value="light" title="Light Color Palette" icon={Icon.Sun} />
        <Form.Dropdown.Item value="dark" title="Dark Color Palette" icon={Icon.Moon} />
      </Form.Dropdown>
      <FormKeywordsFields
        data={{ keywords: keywords.keywords }}
        form={{ keywordProps: form.items.keywords }}
        actions={{
          onUpdate: formActions.updateKeywords,
          focus: focus.create,
        }}
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
