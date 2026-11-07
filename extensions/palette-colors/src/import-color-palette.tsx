import { Action, ActionPanel, Form, Icon, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm, useLocalStorage } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useRef } from "react";
import { FormKeywordsFields } from "./components/FormKeywordsFields";
import { DESCRIPTION_FIELD_MAXLENGTH, MAX_COLOR_FIELDS, NAME_FIELD_MAXLENGTH, SHORTCUTS } from "./constants";

const MAX_LISTED_INVALID_ENTRIES = 3;

/** Pasted colors: at least one, all valid hex, at most MAX_COLOR_FIELDS after removing duplicates. */
function validatePastedColors(value: string | undefined, separator: string): string | undefined {
  if (!value?.trim()) return "Paste at least one color";
  if (!separator) return;
  const { validColors, invalidEntries } = parseColorList(value, separator);
  if (invalidEntries.length > 0) {
    const listed = invalidEntries.slice(0, MAX_LISTED_INVALID_ENTRIES).join(", ");
    const more =
      invalidEntries.length > MAX_LISTED_INVALID_ENTRIES
        ? ` (+${invalidEntries.length - MAX_LISTED_INVALID_ENTRIES} more)`
        : "";
    return `Not valid HEX: ${listed}${more}`;
  }
  if (validColors.length > MAX_COLOR_FIELDS) {
    return `Too many colors: ${validColors.length}/${MAX_COLOR_FIELDS}`;
  }
}
import { useFormFocus } from "./hooks/useFormFocus";
import { useFormKeywords } from "./hooks/useFormKeywords";
import { useKeywordsInput } from "./hooks/useKeywordsInput";
import { SavedPalette } from "./types";
import { withFocus, withLiveValidation } from "./utils/fieldProps";
import { validateDescription, validateName } from "./utils/formValidation";
import { parseColorList } from "./utils/parseColorList";
import { syncFormKeywords } from "./utils/syncFormKeywords";

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

  // Validation runs outside render, so it reads the current separator from a ref.
  const separatorRef = useRef(INITIAL_VALUES.separator);

  const { handleSubmit, itemProps, setValue, setValidationError, reset, values } = useForm<ImportFormValues>({
    initialValues: INITIAL_VALUES,
    validation: {
      pastedColors: (value) => validatePastedColors(value, separatorRef.current),
      separator: FormValidation.Required,
      name: validateName,
      description: validateDescription,
      mode: FormValidation.Required,
    },
    async onSubmit(values) {
      try {
        const { validColors, invalidEntries, duplicateCount } = parseColorList(values.pastedColors, values.separator);
        if (validColors.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "No Valid Colors",
            message: "Check the input and the separator.",
          });
          return;
        }
        // Validation already rejects invalid entries and more than MAX_COLOR_FIELDS colors;
        // the checks here only guard against values that bypassed it.
        if (invalidEntries.length > 0 || validColors.length > MAX_COLOR_FIELDS) return;
        const colors = validColors;

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
          message:
            duplicateCount > 0
              ? `${colors.length} colors (${duplicateCount} duplicates removed)`
              : `${colors.length} colors`,
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

  separatorRef.current = values.separator;

  const updateKeywords = async (keywordsText: string) => {
    const result = await keywords.update(keywordsText);
    setValue("keywords", (prev: string[]) => syncFormKeywords(result, prev ?? []));
    return result;
  };
  const { keywordsInput } = useKeywordsInput(updateKeywords);
  const isUpdatingKeywords = focus.currentField === "updateKeywords";
  const addKeywordsAction = (
    <Action icon={Icon.Tag} title="Add Keywords" onAction={keywordsInput.apply} key="add-keywords" />
  );

  const setError = (id: string, error: string | undefined) => setValidationError(id as keyof ImportFormValues, error);

  // Changing the separator changes how the pasted text splits, so re-check the colors.
  const separatorProps = {
    ...itemProps.separator,
    onChange: (separator: string) => {
      itemProps.separator.onChange?.(separator);
      separatorRef.current = separator;
      if (values.pastedColors) setError("pastedColors", validatePastedColors(values.pastedColors, separator));
    },
  };

  return (
    <Form
      actions={
        <ActionPanel>
          {isUpdatingKeywords && addKeywordsAction}
          <Action.SubmitForm
            icon={Icon.Check}
            onSubmit={(formValues: ImportFormValues) => keywordsInput.confirmNoPending() && handleSubmit(formValues)}
            title="Save Palette"
          />
          {!isUpdatingKeywords && keywordsInput.hasPending && addKeywordsAction}
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
        {...withLiveValidation(
          withFocus(itemProps.pastedColors, focus.create("pastedColors")),
          (value: string) => validatePastedColors(value, separatorRef.current),
          setError,
        )}
        title="Colors*"
        placeholder="#FF5733;#00FF00;#1E90FF"
        info={`Paste up to ${MAX_COLOR_FIELDS} hex colors separated by a character (set below) or one per line. Duplicates are removed.`}
      />
      <Form.TextField
        {...withFocus(separatorProps, focus.create("separator"))}
        title="Separator*"
        placeholder=";"
        info="Character that splits the pasted colors. Line breaks always count as separators too, regardless of this value."
      />
      <Form.TextField
        {...withLiveValidation(withFocus(itemProps.name, focus.create("name")), validateName, setError)}
        title="Name*"
        placeholder="e.g., Editorial Brights"
        info={`Insert the name of your Color Palette (max ${NAME_FIELD_MAXLENGTH} characters)`}
      />
      <Form.TextArea
        {...withLiveValidation(
          withFocus(itemProps.description, focus.create("description")),
          validateDescription,
          setError,
        )}
        title="Description"
        info={`Insert a short description (optional, max ${DESCRIPTION_FIELD_MAXLENGTH} characters).`}
      />
      <Form.Dropdown {...withFocus(itemProps.mode, focus.create("mode"))} title="Mode*">
        <Form.Dropdown.Item value="light" title="Light Color Palette" icon={Icon.Sun} />
        <Form.Dropdown.Item value="dark" title="Dark Color Palette" icon={Icon.Moon} />
      </Form.Dropdown>
      <FormKeywordsFields
        data={{ keywords: keywords.keywords }}
        form={{ keywordProps: itemProps.keywords }}
        keywordsInput={keywordsInput}
        focus={focus.create}
      />
    </Form>
  );
}
