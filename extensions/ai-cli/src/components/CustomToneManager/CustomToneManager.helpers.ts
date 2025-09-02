import { Icon } from "@raycast/api";
import { CustomTone } from "@/hooks/useCustomTones";
import { getSecureEntityIcon } from "@/utils/validation";
import { UI_CONSTANTS } from "@/constants/ui";
import { confirmDeletion, executeDeleteOperation } from "@/utils/confirmation";
import { ENTITY_TYPES } from "@/constants";
import { createTempEntity, filterEntities, getEntityCountMessage } from "@/utils/entity-list-helpers";

export const getToneIcon = (tone: CustomTone): Icon | string => {
  return getSecureEntityIcon(tone.icon, UI_CONSTANTS.ENTITY_ICONS.TONE);
};

export const getFullGuidelinesContent = (tone: CustomTone): string => {
  // For the default tone or empty tone.id, return empty string
  if (tone.id === "default" || !tone.id) {
    return "";
  }

  if (tone.guidelines && tone.guidelines.trim()) {
    return tone.guidelines;
  }

  return tone.guidelines || "";
};

export const getToneSubtitle = (tone: CustomTone): string => {
  if (!tone.guidelines?.trim()) {
    return "";
  }
  return tone.guidelines;
};

/**
 * Filters tones based on search text
 * @param tones Array of tones to filter
 * @param searchText Search query string
 * @returns Filtered array of tones
 */
export const filterTones = (tones: CustomTone[], searchText: string): CustomTone[] => {
  return filterEntities(tones, searchText, ["name", "guidelines"]);
};

/**
 * Creates a temporary tone object for new tone creation
 * @returns Temporary CustomTone object
 */
export const createTempTone = (): CustomTone => {
  const defaults = {
    id: "",
    name: "",
    guidelines: "",
    icon: "",
    isBuiltIn: false,
  } as CustomTone;

  return createTempEntity(defaults);
};

/**
 * Handles tone deletion with confirmation
 * @param tone Tone to delete
 * @param deleteTone Function to delete the tone
 */
export const handleToneDeletion = async (
  tone: CustomTone,
  deleteTone: (id: string) => Promise<void>
): Promise<void> => {
  const confirmed = await confirmDeletion(ENTITY_TYPES.TONE, tone.name);
  if (!confirmed) return;

  await executeDeleteOperation(ENTITY_TYPES.TONE, tone.name, () => deleteTone(tone.id));
};

/**
 * Calculates the display count message for tones
 * @param filteredCount Number of filtered tones
 * @returns Formatted count message
 */
export const getTonesCountMessage = (filteredCount: number): string => {
  return getEntityCountMessage(filteredCount, "Tones");
};
