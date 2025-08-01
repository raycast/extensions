import { Form, Icon } from "@raycast/api";
import { FormColorsFields } from "./components/palette/FormColorsFields";
import { FormKeywordsFields } from "./components/palette/FormKeywordsFields";
import { SavePaletteActions } from "./components/palette/SavePaletteActions";
import { DESCRIPTION_FIELD_MAXLENGTH, NAME_FIELD_MAXLENGTH } from "./constants";
import { useFormActions } from "./hooks/useFormActions";
import { useFormColors } from "./hooks/useFormColors";
import { useFormFocus } from "./hooks/useFormFocus";
import { useFormKeywords } from "./hooks/useFormKeywords";
import { useFormPalette } from "./hooks/useFormPalette";
import { useFormSetup } from "./hooks/useFormSetup";
import { SavePaletteFormProps } from "./types";

export default function Command(props: SavePaletteFormProps) {
  const { draftValues, launchContext = {} } = props;

  // Check if we're in editing mode (nested context)
  const isEditing = Boolean(draftValues?.editId);

  const { initialValues } = useFormSetup({ draftValues, launchContext });
  const { colorFields } = useFormColors(initialValues);
  const { keywords } = useFormKeywords(initialValues);
  const { focus } = useFormFocus();
  const { form } = useFormPalette({ colorFields, initialValues, isEditing });
  const { formActions } = useFormActions({
    colorFields,
    updateForm: form.update,
    resetForm: form.reset,
    setFocus: focus.set,
    updateKeywords: keywords.update,
  });

  // Extract only color fields for FormColorsFields component
  const colorProps = Object.fromEntries(
    Object.entries(form.items).filter(([key]) => key.startsWith("color")),
  ) as Record<string, Partial<Form.ItemProps<string>> & { id: string }>;

  return (
    <Form
      actions={
        <SavePaletteActions handleSubmit={form.submit} formActions={formActions} colorCount={colorFields.count} />
      }
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
        form={{ colorProps }}
        focus={{
          currentField: focus.field,
          create: focus.create,
        }}
      />
    </Form>
  );
}
