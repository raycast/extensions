import { LocalStorage } from "@raycast/api";
import { TooltipField } from "../types";

const STORAGE_KEY = "tooltip-fields";

/** No extra fields: a Card's tooltip shows just its name until the user opts in to more. */
export const DEFAULT_TOOLTIP_FIELDS: TooltipField[] = [];

export const TOOLTIP_FIELD_OPTIONS: { value: TooltipField; title: string }[] = [
  { value: "date-created", title: "Date Created" },
  { value: "date-modified", title: "Date Modified" },
  { value: "size", title: "File Size" },
  { value: "usage", title: "Times Used" },
  { value: "dimensions", title: "Pixel Dimensions" },
];

const VALID_FIELDS = new Set(TOOLTIP_FIELD_OPTIONS.map((option) => option.value));

export async function loadTooltipFields(): Promise<TooltipField[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return DEFAULT_TOOLTIP_FIELDS;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_TOOLTIP_FIELDS;
    return parsed.filter((field): field is TooltipField => VALID_FIELDS.has(field));
  } catch {
    return DEFAULT_TOOLTIP_FIELDS;
  }
}

export async function saveTooltipFields(fields: TooltipField[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
}
