import { MODIFIERS, SCOPE_TYPES } from "../types/shortcut";
import type { ScopeType, ShortcutFormValues, ShortcutModifier } from "../types/shortcut";

export type FormErrors = Partial<Record<keyof ShortcutFormValues, string>>;

export function isShortcutModifier(value: string): value is ShortcutModifier {
  return MODIFIERS.includes(value as ShortcutModifier);
}

export function isScopeType(value: string): value is ScopeType {
  return SCOPE_TYPES.includes(value as ScopeType);
}

const MAX_COMMAND_NAME_LENGTH = 512;
const MAX_KEY_LENGTH = 128;
const MAX_OWNER_NAME_LENGTH = 512;
const MAX_NOTES_LENGTH = 4_000;

export function validateShortcutForm(values: ShortcutFormValues): FormErrors {
  const errors: FormErrors = {};

  const commandName = values.commandName.trim();
  if (!commandName) {
    errors.commandName = "Enter a command name.";
  } else if (commandName.length > MAX_COMMAND_NAME_LENGTH) {
    errors.commandName = `Command name must be ${MAX_COMMAND_NAME_LENGTH} characters or fewer.`;
  }

  const key = values.key === " " ? "Space" : values.key.trim();
  if (!key) {
    errors.key = "Enter a key.";
  } else if (key.length > MAX_KEY_LENGTH) {
    errors.key = `Key must be ${MAX_KEY_LENGTH} characters or fewer.`;
  }

  const ownerName = values.ownerName.trim();
  if (ownerName.length > MAX_OWNER_NAME_LENGTH) {
    errors.ownerName = `Owner name must be ${MAX_OWNER_NAME_LENGTH} characters or fewer.`;
  }

  if (values.notes && values.notes.length > MAX_NOTES_LENGTH) {
    errors.notes = `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`;
  }

  if (!isScopeType(values.scope)) {
    errors.scope = "Choose a scope.";
  }

  return errors;
}

export function hasFormErrors(errors: FormErrors): boolean {
  return Object.values(errors).some(Boolean);
}
