/**
 * Preset/template system for saved rename configurations
 */

import { LocalStorage } from "@raycast/api";
import { log } from "./logger";
import { CaseStyle, SortField, SortDirection, TemplateDateSource, type NamingTemplate } from "../types";

export interface RenamePreset {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  /** Preset type: 'rename' for basic rename, 'replace' for find/replace, 'template' for template-based */
  type?: "rename" | "replace" | "template";
  config: {
    // Rename command settings
    prefix?: string;
    suffix?: string;
    separator?: string;
    indexSeparator?: string;
    startNumber?: number;
    paddingDigits?: number;
    caseStyle?: CaseStyle;
    preserveName?: boolean;

    // Replace command settings
    replacePattern?: string;
    replacement?: string;
    useRegex?: boolean;

    // Template settings
    template?: TemplateConfig;
  };
}

/**
 * Template configuration stored in presets
 */
export interface TemplateConfig {
  pattern: string;
  dateSource: TemplateDateSource;
  counter: {
    start: number;
    step: number;
    padding: number;
  };
  sort: {
    field: SortField;
    direction: SortDirection;
  };
  transliteration: {
    enabled: boolean;
    removeAccents: boolean;
  };
  caseStyle: CaseStyle;
}

/**
 * Convert a NamingTemplate to a TemplateConfig for storage
 */
export function templateToConfig(template: NamingTemplate): TemplateConfig {
  return {
    pattern: template.pattern,
    dateSource: template.dateSource,
    counter: template.counter,
    sort: template.sort,
    transliteration: template.transliteration,
    caseStyle: template.caseStyle,
  };
}

/**
 * Convert a TemplateConfig back to a NamingTemplate
 */
export function configToTemplate(config: TemplateConfig, preset: RenamePreset, isBuiltIn = false): NamingTemplate {
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    pattern: config.pattern,
    dateSource: config.dateSource,
    counter: config.counter,
    sort: config.sort,
    transliteration: config.transliteration,
    caseStyle: config.caseStyle,
    isBuiltIn,
  };
}

const PRESETS_KEY = "renaming-presets";

/**
 * Get all saved presets
 */
export async function getPresets(): Promise<RenamePreset[]> {
  const data = await LocalStorage.getItem<string>(PRESETS_KEY);
  if (!data) return [];

  try {
    return JSON.parse(data) as RenamePreset[];
  } catch (error) {
    log.presets.error("Stored presets data is corrupted, backing up and returning empty list", error);
    // Preserve corrupted data so user can recover manually
    try {
      await LocalStorage.setItem(`${PRESETS_KEY}-corrupted-backup`, data);
    } catch {
      // Best-effort backup
    }
    return [];
  }
}

/**
 * Save a new preset
 */
export async function savePreset(preset: Omit<RenamePreset, "id" | "createdAt">): Promise<RenamePreset> {
  const presets = await getPresets();

  const newPreset: RenamePreset = {
    ...preset,
    id: generateId(),
    createdAt: Date.now(),
  };

  presets.push(newPreset);
  try {
    await LocalStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch (error) {
    log.presets.warn("Failed to save preset", error);
    throw error;
  }

  return newPreset;
}

/**
 * Update an existing preset
 */
export async function updatePreset(
  id: string,
  updates: Partial<Omit<RenamePreset, "id" | "createdAt">>,
): Promise<boolean> {
  const presets = await getPresets();
  const index = presets.findIndex((p) => p.id === id);

  if (index === -1) return false;

  presets[index] = { ...presets[index]!, ...updates };
  try {
    await LocalStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch (error) {
    log.presets.warn("Failed to update preset", error);
    throw error;
  }

  return true;
}

/**
 * Delete a preset
 */
export async function deletePreset(id: string): Promise<boolean> {
  const presets = await getPresets();
  const filtered = presets.filter((p) => p.id !== id);

  if (filtered.length === presets.length) return false;

  try {
    await LocalStorage.setItem(PRESETS_KEY, JSON.stringify(filtered));
  } catch (error) {
    log.presets.warn("Failed to delete preset", error);
    throw error;
  }
  return true;
}

/**
 * Get a preset by ID
 */
export async function getPresetById(id: string): Promise<RenamePreset | null> {
  const presets = await getPresets();
  return presets.find((p) => p.id === id) || null;
}

/**
 * Generate a simple unique ID
 */
function generateId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Default presets that can be added
 */
export const DEFAULT_PRESETS: Omit<RenamePreset, "id" | "createdAt">[] = [
  {
    name: "Photo Sequence",
    description: "Rename photos with date prefix and sequence number",
    type: "rename",
    config: {
      prefix: "",
      suffix: "",
      separator: "_",
      indexSeparator: "-",
      startNumber: 1,
      paddingDigits: 3,
      caseStyle: CaseStyle.LOWERCASE,
      preserveName: false,
    },
  },
  {
    name: "Clean Filenames",
    description: "Convert to lowercase with underscores",
    type: "rename",
    config: {
      caseStyle: CaseStyle.SNAKE_CASE,
      preserveName: true,
    },
  },
  {
    name: "Remove Spaces",
    description: "Replace spaces with underscores",
    type: "replace",
    config: {
      replacePattern: " ",
      replacement: "_",
      useRegex: false,
    },
  },
  {
    name: "Remove Special Characters",
    description: "Remove common special characters from filenames",
    type: "replace",
    config: {
      replacePattern: "[^a-zA-Z0-9._-]",
      replacement: "",
      useRegex: true,
    },
  },
];

/**
 * Default template presets
 */
export const DEFAULT_TEMPLATE_PRESETS: Omit<RenamePreset, "id" | "createdAt">[] = [
  {
    name: "Photo Date Sequence",
    description: "Rename photos using EXIF date with sequential numbers",
    type: "template",
    config: {
      template: {
        pattern: "{exif.dateTaken:YYYY-MM-DD}_{counter:001}",
        dateSource: TemplateDateSource.EXIF,
        counter: { start: 1, step: 1, padding: 3 },
        sort: { field: SortField.DATE_TAKEN, direction: SortDirection.ASC },
        transliteration: { enabled: false, removeAccents: false },
        caseStyle: CaseStyle.UNCHANGED,
      },
    },
  },
  {
    name: "Document Cleanup",
    description: "Clean document names with date suffix and snake_case",
    type: "template",
    config: {
      template: {
        pattern: "{original}_{file.modified:YYYY-MM-DD}",
        dateSource: TemplateDateSource.MODIFIED,
        counter: { start: 1, step: 1, padding: 3 },
        sort: { field: SortField.NAME, direction: SortDirection.ASC },
        transliteration: { enabled: true, removeAccents: true },
        caseStyle: CaseStyle.SNAKE_CASE,
      },
    },
  },
  {
    name: "Timestamped Backup",
    description: "Add timestamp for backup/versioning",
    type: "template",
    config: {
      template: {
        pattern: "{original}_{date:YYYYMMDD}_{time:HHmmss}",
        dateSource: TemplateDateSource.NOW,
        counter: { start: 1, step: 1, padding: 3 },
        sort: { field: SortField.NONE, direction: SortDirection.ASC },
        transliteration: { enabled: false, removeAccents: false },
        caseStyle: CaseStyle.UNCHANGED,
      },
    },
  },
];

/**
 * Get all presets including template presets
 */
export function getAllDefaultPresets(): Omit<RenamePreset, "id" | "createdAt">[] {
  return [...DEFAULT_PRESETS, ...DEFAULT_TEMPLATE_PRESETS];
}

/**
 * Check if a preset is a template preset
 */
export function isTemplatePreset(preset: RenamePreset): boolean {
  return preset.type === "template" && !!preset.config.template;
}
