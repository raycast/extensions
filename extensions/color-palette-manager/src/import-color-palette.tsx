import { Action, ActionPanel, Form, Icon, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm, useLocalStorage } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { FormKeywordsFields } from "./components/FormKeywordsFields";
import { DESCRIPTION_FIELD_MAXLENGTH, MAX_COLOR_FIELDS, NAME_FIELD_MAXLENGTH, SHORTCUTS } from "./constants";
import { useFormFocus } from "./hooks/useFormFocus";
import { useFormKeywords } from "./hooks/useFormKeywords";
import { SavedPalette } from "./types";
import { parseColorList } from "./utils/parseColorList";

interface ImportFormValues {
  pastedColors: string;
  separator: string;
  name: string;
  description: string;
  mode: string;
  keywords: string[];
}

const INITIAL_VALUES: ImportFormValues = {
  pastedColors: "",
  separator: ";",
  name: "",
  description: "",
  mode: "light",
  keywords: [],
};

export default function ImportColorPalette() {
  const { keywords } = useFormKeywords();
  const { focus } = useFormFocus();
  const { value: storedPalettes, setValue: setStoredPalettes } = useLocalStorage<SavedPalette[]>(
    "color-palettes-list",
    [],
  );

  const { handleSubmit, itemProps, setValue, reset } = useForm<ImportFormValues>({
    initialValues: INITIAL_VALUES,
    validation: {
      pastedColors: (value) => {
        if (!value?.trim()) return "Paste at least one color";
      },
      separator: FormValidation.Required,
      name: (value) => {
        if (!value) return FormValidation.Required;
        if (value.length > NAME_FIELD_MAXLENGTH)
          return `Limit exceeded: keep it under ${NAME_FIELD_MAXLENGTH} characters`;
      },
      description: (value) => {
        if (value && value.length > DESCRIPTION_FIELD_MAXLENGTH)
          return `Limit exceeded: keep it under ${DESCRIPTION_FIELD_MAXLENGTH} characters`;
      },
      mode: FormValidation.Required,
    },
    async onSubmit(values) {
      try {
        const { validColors, invalidEntries } = parseColorList(values.pastedColors, values.separator);
        if (validColors.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "No Valid Colors",
            message: "Check the input and the separator.",
          });
          return;
        }
        const colors = validColors.slice(0, MAX_COLOR_FIELDS);
        const overflow = Math.max(0, validColors.length - MAX_COLOR_FIELDS);
        const skipped = invalidEntries.length + overflow;

        const palette: SavedPalette = {
          id: randomUUID(),
          name: values.name,
          description: values.description,
          mode: values.mode as "light" | "dark",
          keywords: values.keywords,
          colors,
          createdAt: new Date().toISOString(),
        };

        await setStoredPalettes([palette, ...(storedPalettes ?? [])]);

        showToast({
          style: Toast.Style.Success,
          title: "Palette Imported",
          message: skipped > 0 ? `${colors.length} colors (${skipped} skipped)` : `${colors.length} colors`,
        });

        try {
          await launchCommand({
            name: "manage-color-palettes",
            type: LaunchType.UserInitiated,
          });
        } catch (navErr) {
          console.warn("navigation to Manage Color Palettes failed", navErr);
        }
      } catch (err) {
        console.error("import palette submit failed", err);
        showToast({
          style: Toast.Style.Failure,
          title: "Save Failed",
          message: "Could not import the color palette.",
        });
      }
    },
  });

  const updateKeywords = async (keywordsText: string) => {
    const result = await keywords.update(keywordsText);
    setValue("keywords", (prev: string[]) => [...prev, ...result.validKeywords]);
    return result;
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} title="Save Palette" />
          <Action
            icon={Icon.Wand}
            title="Clear Form"
            onAction={() => reset(INITIAL_VALUES)}
            shortcut={SHORTCUTS.CLEAR_FORM}
            style={Action.Style.Destructive}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Import Color Palette" />
      <Form.TextArea
        {...itemProps.pastedColors}
        title="Colors*"
        placeholder="#FF5733;#00FF00;#1E90FF"
        info="Paste hex colors separated by a character (set below) or one per line."
        {...focus.create("pastedColors")}
      />
      <Form.TextField
        {...itemProps.separator}
        title="Separator*"
        placeholder=";"
        info="Character that splits the pasted colors. Line breaks always count as separators too, regardless of this value."
        {...focus.create("separator")}
      />
      <Form.TextField
        {...itemProps.name}
        title="Name*"
        info={`Insert the name of your Color Palette (max ${NAME_FIELD_MAXLENGTH} characters)`}
        {...focus.create("name")}
      />
      <Form.TextArea
        {...itemProps.description}
        title="Description"
        info={`Insert a short description (optional, max ${DESCRIPTION_FIELD_MAXLENGTH} characters).`}
        {...focus.create("description")}
      />
      <Form.Dropdown {...itemProps.mode} title="Mode*" {...focus.create("mode")}>
        <Form.Dropdown.Item value="light" title="Light Color Palette" icon={Icon.Sun} />
        <Form.Dropdown.Item value="dark" title="Dark Color Palette" icon={Icon.Moon} />
      </Form.Dropdown>
      <FormKeywordsFields
        data={{ keywords: keywords.keywords }}
        form={{ keywordProps: itemProps.keywords }}
        actions={{
          onUpdate: updateKeywords,
          focus: focus.create,
        }}
      />
    </Form>
  );
}
