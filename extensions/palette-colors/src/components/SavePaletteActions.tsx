import { Action, ActionPanel, Icon } from "@raycast/api";
import { MAX_COLOR_FIELDS, SHORTCUTS } from "../constants";
import {
  PaletteFormFields,
  UseFormActionsObject,
  UseFormColorsObject,
  UseFormFocusObject,
  UseFormPaletteObject,
  UseKeywordsInputObject,
} from "../types";
import { FormPalettePreview } from "./FormPalettePreview";

interface SavePaletteActionsProps {
  form: UseFormPaletteObject;
  formActions: UseFormActionsObject;
  colorFields: UseFormColorsObject;
  focus: UseFormFocusObject;
  keywordsInput: UseKeywordsInputObject;
}

export function SavePaletteActions({ form, formActions, colorFields, focus, keywordsInput }: SavePaletteActionsProps) {
  const lastFocusedColorInfo =
    focus.lastField && focus.lastField?.startsWith("color")
      ? {
          value: form.colors[focus.lastField]?.value || "",
          number: focus.lastField.replace("color", "").trim(),
        }
      : undefined;

  const addKeywordsAction = (
    <Action icon={Icon.Tag} title="Add Keywords" onAction={keywordsInput.apply} key="add-keywords" />
  );
  const isUpdatingKeywords = focus.currentField === "updateKeywords";

  return (
    <ActionPanel>
      {isUpdatingKeywords && addKeywordsAction}
      <Action.SubmitForm
        icon={Icon.Check}
        onSubmit={(values: PaletteFormFields) => keywordsInput.confirmNoPending() && form.submit(values)}
        title="Save Palette"
      />
      {!isUpdatingKeywords && keywordsInput.hasPending && addKeywordsAction}
      {form.hasValidColorFields && (
        <Action.Push
          icon={Icon.Swatch}
          title="Preview Palette"
          target={<FormPalettePreview colors={formActions.getPreview().colors} />}
          shortcut={SHORTCUTS.PREVIEW_PALETTE}
        />
      )}
      {form.hasValidColorFields && colorFields.count < MAX_COLOR_FIELDS && (
        <Action
          icon={Icon.PlusCircle}
          title="Add New Empty Color Field"
          onAction={formActions.addColor}
          shortcut={SHORTCUTS.ADD_COLOR_FIELD}
        />
      )}
      {colorFields.count > 1 && focus.lastField?.startsWith("color") && lastFocusedColorInfo && (
        <Action
          icon={Icon.MinusCircle}
          title={`Remove Color ${lastFocusedColorInfo.number}${lastFocusedColorInfo.value ? " - " + lastFocusedColorInfo.value : ""}`}
          onAction={formActions.removeColor}
          shortcut={SHORTCUTS.REMOVE_COLOR_FIELD}
          style={Action.Style.Destructive}
        />
      )}
      <Action
        icon={Icon.Wand}
        title="Clear Form"
        onAction={formActions.clear}
        shortcut={SHORTCUTS.CLEAR_FORM}
        style={Action.Style.Destructive}
      />
    </ActionPanel>
  );
}
