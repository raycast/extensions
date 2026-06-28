import { Icon } from "@raycast/api";

import { useLocalStorage } from "./useLocalStorage";

export type CreateReminderFieldId = "title" | "notes" | "dueDate" | "recurrence" | "list" | "priority" | "location";

export type CreateReminderFieldDefinition = {
  id: CreateReminderFieldId;
  title: string;
  description: string;
  icon: Icon;
  required?: boolean;
  dependsOn?: CreateReminderFieldId;
};

export type CreateReminderFormFieldItem = {
  type: "field";
  id: CreateReminderFieldId;
  enabled: boolean;
};

export type CreateReminderFormSeparatorItem = {
  type: "separator";
  id: string;
};

export type CreateReminderFormLayoutItem = CreateReminderFormFieldItem | CreateReminderFormSeparatorItem;

const STORAGE_KEY = "create-reminder-form-layout";

export const createReminderFieldDefinitions: CreateReminderFieldDefinition[] = [
  {
    id: "title",
    title: "Title",
    description: "Reminder title. This field is required.",
    icon: Icon.Text,
    required: true,
  },
  {
    id: "notes",
    title: "Notes",
    description: "Optional notes for extra detail.",
    icon: Icon.Document,
  },
  {
    id: "dueDate",
    title: "Date",
    description: "Set a due date or date and time.",
    icon: Icon.Calendar,
  },
  {
    id: "recurrence",
    title: "Recurrence",
    description: "Repeat controls shown after a due date is selected.",
    icon: Icon.Repeat,
    dependsOn: "dueDate",
  },
  {
    id: "list",
    title: "List",
    description: "Pick which reminders list the new reminder belongs to.",
    icon: Icon.List,
  },
  {
    id: "priority",
    title: "Priority",
    description: "Choose a reminder priority.",
    icon: Icon.ExclamationMark,
  },
  {
    id: "location",
    title: "Location",
    description: "Location-based reminder fields and saved locations.",
    icon: Icon.Pin,
  },
];

const fieldDefinitionMap = new Map(createReminderFieldDefinitions.map((field) => [field.id, field]));

export function createSeparatorItem(): CreateReminderFormSeparatorItem {
  return {
    type: "separator",
    id: `separator-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

function isLegacyFieldItem(value: unknown): value is { id: CreateReminderFieldId; enabled: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "enabled" in value &&
    isFieldId(value.id) &&
    typeof value.enabled === "boolean"
  );
}

function isStoredSeparatorItem(value: unknown): value is CreateReminderFormSeparatorItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "id" in value &&
    value.type === "separator" &&
    typeof value.id === "string"
  );
}

function isStoredFieldItem(value: unknown): value is CreateReminderFormFieldItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "id" in value &&
    "enabled" in value &&
    value.type === "field" &&
    isFieldId(value.id) &&
    typeof value.enabled === "boolean"
  );
}

export const defaultCreateReminderFormLayout: CreateReminderFormLayoutItem[] = [
  { type: "field", id: "title", enabled: true },
  { type: "field", id: "notes", enabled: true },
  createSeparatorItem(),
  { type: "field", id: "dueDate", enabled: true },
  { type: "field", id: "recurrence", enabled: true },
  { type: "field", id: "list", enabled: true },
  { type: "field", id: "priority", enabled: true },
  createSeparatorItem(),
  { type: "field", id: "location", enabled: true },
];

function isFieldId(value: unknown): value is CreateReminderFieldId {
  return typeof value === "string" && fieldDefinitionMap.has(value as CreateReminderFieldId);
}

export function normalizeCreateReminderFormLayout(layout: unknown[] | undefined): CreateReminderFormLayoutItem[] {
  const seenFields = new Set<CreateReminderFieldId>();
  const normalized: CreateReminderFormLayoutItem[] = [];

  for (const item of layout ?? []) {
    if (isStoredSeparatorItem(item)) {
      normalized.push(item);
      continue;
    }

    if (isStoredFieldItem(item)) {
      const definition = fieldDefinitionMap.get(item.id);
      if (!definition || seenFields.has(item.id)) {
        continue;
      }

      seenFields.add(item.id);
      normalized.push({
        type: "field",
        id: item.id,
        enabled: definition.required ? true : item.enabled,
      });
      continue;
    }

    if (isLegacyFieldItem(item) && !seenFields.has(item.id)) {
      const definition = fieldDefinitionMap.get(item.id);
      seenFields.add(item.id);
      normalized.push({
        type: "field",
        id: item.id,
        enabled: definition?.required ? true : item.enabled,
      });
    }
  }

  for (const field of createReminderFieldDefinitions) {
    if (seenFields.has(field.id)) {
      continue;
    }

    normalized.push({
      type: "field",
      id: field.id,
      enabled: true,
    });
  }

  return normalized;
}

export default function useCreateReminderFormLayout() {
  const storage = useLocalStorage<CreateReminderFormLayoutItem[]>(STORAGE_KEY, defaultCreateReminderFormLayout);

  return {
    ...storage,
    value: normalizeCreateReminderFormLayout(storage.value),
  };
}
