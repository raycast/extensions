import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { MODIFIER_LABELS, SCOPE_LABELS } from "../lib/labels";
import { GENERAL_OWNER_NAME, inferCustomOwnerType } from "../lib/owner-type";
import { getShortcutOwnerOptions, type ShortcutOwnerOption } from "../lib/shortcut-data";
import { createCustomShortcut, findDuplicateCustomShortcut, updateCustomShortcut } from "../lib/storage";
import { formatShortcutDisplay } from "../lib/shortcut-format";
import { hasFormErrors, validateShortcutForm, type FormErrors } from "../lib/validation";
import { MODIFIERS, type Shortcut, type ShortcutFormValues, type ShortcutModifier } from "../types/shortcut";

type Props = {
  shortcut?: Shortcut;
  onSaved?: () => void;
};

export function ShortcutForm({ shortcut, onSaved }: Props) {
  const { pop } = useNavigation();
  const initialValues = shortcut ? getShortcutFormValues(shortcut) : createEmptyValues();
  const [values, setValues] = useState<ShortcutFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [ownerOptions, setOwnerOptions] = useState<ShortcutOwnerOption[]>([]);
  const [formResetKey, setFormResetKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commandNameRef = useRef<Form.TextField>(null);
  const modifiersRef = useRef<Form.TagPicker>(null);
  const keyRef = useRef<Form.TextField>(null);
  const ownerNameRef = useRef<Form.TextField>(null);
  const scopeRef = useRef<Form.Dropdown>(null);
  const notesRef = useRef<Form.TextArea>(null);
  const preview = formatShortcutDisplay(values.modifiers, values.key);
  const isEditing = Boolean(shortcut);
  const submittedValues = getCanonicalOwnerValues(values, ownerOptions);
  const ownerPreview = submittedValues.ownerName.trim() || GENERAL_OWNER_NAME;
  const ownerMatch = getMatchingOwnerOption(values.ownerName, ownerOptions);
  const ownerStatus = getOwnerStatus(values.ownerName, ownerMatch);

  const refreshOwnerOptions = useCallback(async () => {
    try {
      setOwnerOptions(await getShortcutOwnerOptions());
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load owners",
        message: error instanceof Error ? error.message : "You can still type an owner manually.",
      });
    }
  }, []);

  useEffect(() => {
    void refreshOwnerOptions();
  }, [refreshOwnerOptions]);

  async function handleSubmit(formValues: Form.Values) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const nextSubmittedValues = getCanonicalOwnerValues(getSubmittedFormValues(formValues, values), ownerOptions);
      const nextPreview = formatShortcutDisplay(nextSubmittedValues.modifiers, nextSubmittedValues.key);
      const nextOwnerPreview = nextSubmittedValues.ownerName.trim() || GENERAL_OWNER_NAME;
      const nextErrors = validateShortcutForm(nextSubmittedValues);
      setErrors(nextErrors);
      setValues(nextSubmittedValues);

      if (hasFormErrors(nextErrors)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Shortcut needs attention",
          message: "Review the highlighted fields.",
        });
        return;
      }

      const duplicate = await findDuplicateCustomShortcut(nextSubmittedValues, shortcut?.id);
      if (duplicate) {
        const confirmed = await confirmAlert({
          title: "Save duplicate shortcut?",
          message: `${nextPreview} already exists for ${nextOwnerPreview} as ${duplicate.commandName}.`,
          primaryAction: {
            title: "Save Anyway",
            style: Alert.ActionStyle.Default,
          },
        });

        if (!confirmed) {
          return;
        }
      }

      if (shortcut) {
        await updateCustomShortcut(shortcut.id, nextSubmittedValues);
        await showToast({ style: Toast.Style.Success, title: "Shortcut updated" });
        onSaved?.();
        pop();
        return;
      }

      const savedShortcut = await createCustomShortcut(nextSubmittedValues);
      setErrors({});
      setOwnerOptions((current) =>
        upsertOwnerOption(current, {
          ownerName: savedShortcut.ownerName,
          ownerType: savedShortcut.ownerType,
        }),
      );
      resetFormItems();
      setValues(createEmptyValues());
      setFormResetKey((current) => current + 1);
      void refreshOwnerOptions();
      void showToast({ style: Toast.Style.Success, title: "Shortcut saved", message: nextPreview });
      onSaved?.();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save shortcut",
        message: error instanceof Error ? error.message : "Review the fields and retry.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      key={isEditing ? shortcut?.id : formResetKey}
      isLoading={isSubmitting}
      navigationTitle={isEditing ? "Edit Shortcut" : "Add Shortcut"}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              title={isEditing ? "Save Shortcut" : "Add Shortcut"}
              icon={isEditing ? Icon.CheckCircle : Icon.Plus}
              onSubmit={handleSubmit}
            />
          </ActionPanel.Section>
          {preview ? (
            <ActionPanel.Section title="Preview">
              <Action.CopyToClipboard title="Copy Preview" content={preview} />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        key={`commandName-${formResetKey}`}
        id="commandName"
        title="Command Name"
        placeholder="New Tab"
        info="Use the exact action name you want to find later."
        value={values.commandName}
        error={errors.commandName}
        onChange={(commandName) => setValues((current) => ({ ...current, commandName }))}
        ref={commandNameRef}
      />
      <Form.Separator />
      <Form.TagPicker
        key={`modifiers-${formResetKey}`}
        id="modifiers"
        title="Modifiers"
        info="Pick every modifier in the shortcut. The preview updates immediately."
        value={values.modifiers}
        onChange={(modifiers) => setValues((current) => ({ ...current, modifiers: modifiers as ShortcutModifier[] }))}
        ref={modifiersRef}
      >
        {MODIFIERS.map((modifier) => (
          <Form.TagPicker.Item
            key={modifier}
            value={modifier}
            title={MODIFIER_LABELS[modifier]}
            icon={{ source: Icon.Circle, tintColor: getModifierColor(modifier) }}
          />
        ))}
      </Form.TagPicker>
      <Form.TextField
        key={`key-${formResetKey}`}
        id="key"
        title="Key"
        placeholder="T, E, Enter, Space, 1"
        info="Enter the final key only. Examples: T, Enter, Space, 1."
        value={values.key}
        error={errors.key}
        onChange={(key) => setValues((current) => ({ ...current, key }))}
        ref={keyRef}
      />
      <Form.Description title="Preview" text={preview} />
      <Form.Separator />
      <Form.TextField
        key={`ownerName-${formResetKey}`}
        id="ownerName"
        title="Owner App/Webapp"
        placeholder="General, Safari, Gmail, Raycast"
        info="Type an owner. Existing owner names are reused automatically; blank saves as General."
        value={values.ownerName}
        error={errors.ownerName}
        onChange={(ownerName) =>
          setValues((current) => ({
            ...current,
            ownerName,
          }))
        }
        ref={ownerNameRef}
      />
      <Form.Description title="Owner Match" text={ownerStatus} />
      <Form.Dropdown
        key={`scope-${formResetKey}`}
        id="scope"
        title="Scope"
        info="Scope controls the colored scope bubble shown in search results."
        value={values.scope}
        error={errors.scope}
        onChange={(scope) => setValues((current) => ({ ...current, scope: scope as ShortcutFormValues["scope"] }))}
        ref={scopeRef}
      >
        <Form.Dropdown.Item
          value="global"
          title={SCOPE_LABELS.global}
          icon={{ source: Icon.Circle, tintColor: Color.Red }}
          keywords={["system-wide", "everywhere"]}
        />
        <Form.Dropdown.Item
          value="app"
          title={SCOPE_LABELS.app}
          icon={{ source: Icon.Circle, tintColor: Color.Orange }}
          keywords={["mac app", "application"]}
        />
        <Form.Dropdown.Item
          value="webapp"
          title={SCOPE_LABELS.webapp}
          icon={{ source: Icon.Circle, tintColor: Color.Green }}
          keywords={["website", "web app", "browser"]}
        />
      </Form.Dropdown>
      <Form.Description
        title="Search Tags"
        text={`${ownerPreview} • Custom • ${values.scope === "global" ? "Global" : values.scope === "app" ? "App" : "Webapp"}`}
      />
      <Form.TextArea
        key={`notes-${formResetKey}`}
        id="notes"
        title="Notes"
        placeholder="Optional context, caveats, or where this shortcut is configured."
        value={values.notes}
        onChange={(notes) => setValues((current) => ({ ...current, notes }))}
        ref={notesRef}
      />
    </Form>
  );

  function resetFormItems() {
    commandNameRef.current?.reset();
    modifiersRef.current?.reset();
    keyRef.current?.reset();
    ownerNameRef.current?.reset();
    scopeRef.current?.reset();
    notesRef.current?.reset();
    commandNameRef.current?.focus();
  }
}

function getShortcutFormValues(shortcut: Shortcut): ShortcutFormValues {
  return {
    commandName: shortcut.commandName,
    modifiers: shortcut.modifiers,
    key: shortcut.key,
    ownerName: shortcut.ownerName,
    ownerType: shortcut.ownerType,
    scope: shortcut.scope,
    notes: shortcut.notes ?? "",
  };
}

function createEmptyValues(): ShortcutFormValues {
  return {
    commandName: "",
    modifiers: [],
    key: "",
    ownerName: "",
    ownerType: "other",
    scope: "global",
    notes: "",
  };
}

function getSubmittedFormValues(formValues: Form.Values, fallbackValues: ShortcutFormValues): ShortcutFormValues {
  const rawKey = getStringFormValue(formValues.key, fallbackValues.key);
  return {
    commandName: getStringFormValue(formValues.commandName, fallbackValues.commandName),
    modifiers: getModifierFormValues(formValues.modifiers, fallbackValues.modifiers),
    key: rawKey === " " ? "Space" : rawKey,
    ownerName: getStringFormValue(formValues.ownerName, fallbackValues.ownerName),
    ownerType: fallbackValues.ownerType,
    scope: getScopeFormValue(formValues.scope, fallbackValues.scope),
    notes: getStringFormValue(formValues.notes, fallbackValues.notes),
  };
}

function getStringFormValue(value: Form.Value, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function getModifierFormValues(value: Form.Value, fallback: ShortcutModifier[]): ShortcutModifier[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.filter((modifier): modifier is ShortcutModifier => MODIFIERS.includes(modifier as ShortcutModifier));
}

function getScopeFormValue(value: Form.Value, fallback: ShortcutFormValues["scope"]): ShortcutFormValues["scope"] {
  return value === "global" || value === "app" || value === "webapp" ? value : fallback;
}

function getCanonicalOwnerValues(values: ShortcutFormValues, ownerOptions: ShortcutOwnerOption[]): ShortcutFormValues {
  const ownerName = values.ownerName.trim();

  if (!ownerName) {
    return { ...values, ownerName: GENERAL_OWNER_NAME, ownerType: "other" };
  }

  const option = ownerOptions.find((owner) => owner.ownerName.toLocaleLowerCase() === ownerName.toLocaleLowerCase());

  if (option) {
    return { ...values, ownerName: option.ownerName, ownerType: option.ownerType };
  }

  return { ...values, ownerName, ownerType: inferCustomOwnerType(ownerName, values.scope) };
}

function getMatchingOwnerOption(
  ownerName: string,
  ownerOptions: ShortcutOwnerOption[],
): ShortcutOwnerOption | undefined {
  const trimmedOwnerName = ownerName.trim();

  if (!trimmedOwnerName) {
    return undefined;
  }

  return ownerOptions.find((owner) => owner.ownerName.toLocaleLowerCase() === trimmedOwnerName.toLocaleLowerCase());
}

function getOwnerStatus(ownerName: string, ownerMatch: ShortcutOwnerOption | undefined): string {
  const trimmedOwnerName = ownerName.trim();

  if (!trimmedOwnerName) {
    return "Saves as General.";
  }

  if (ownerMatch) {
    return `Existing owner: ${ownerMatch.ownerName}`;
  }

  return `Creates owner: ${trimmedOwnerName}.`;
}

function upsertOwnerOption(
  ownerOptions: ShortcutOwnerOption[],
  savedOwner: ShortcutOwnerOption,
): ShortcutOwnerOption[] {
  if (savedOwner.ownerName.toLocaleLowerCase() === GENERAL_OWNER_NAME.toLocaleLowerCase()) {
    return ownerOptions;
  }

  if (ownerOptions.some((owner) => owner.ownerName.toLocaleLowerCase() === savedOwner.ownerName.toLocaleLowerCase())) {
    return ownerOptions;
  }

  return [...ownerOptions, savedOwner].sort((a, b) => a.ownerName.localeCompare(b.ownerName));
}

function getModifierColor(modifier: ShortcutModifier): Color.ColorLike {
  switch (modifier) {
    case "command":
      return Color.Blue;
    case "option":
      return Color.Purple;
    case "control":
      return Color.Green;
    case "shift":
      return Color.Orange;
    case "fn":
      return Color.SecondaryText;
  }
}
