import { Icon } from "@raycast/api";
import { CustomTemplate } from "@/hooks/useCustomTemplates";
import { messages } from "@/locale/en/messages";
import { getSecureEntityIcon } from "@/utils/validation";
import { UI_CONSTANTS } from "@/constants/ui";
import { confirmDeletion, executeDeleteOperation } from "@/utils/confirmation";
import { ENTITY_TYPES } from "@/constants";
import { createTempEntity, getEntityCountMessage } from "@/utils/entity-list-helpers";

export const getTemplateIcon = (template: CustomTemplate): Icon | string => {
  return getSecureEntityIcon(template.icon, UI_CONSTANTS.ENTITY_ICONS.TEMPLATE);
};

export const getFullPromptContent = (template: CustomTemplate): string => {
  // Handle new template structure
  if (template.sections?.instructions) {
    const sections = [];

    sections.push(template.sections.instructions);

    if (template.sections.requirements) {
      sections.push(template.sections.requirements);
    }

    if (template.sections.output) {
      sections.push(template.sections.output);
    }

    return sections.join("\n\n");
  }

  return messages.management.noTemplate;
};

export const getTemplateSubtitle = (template: CustomTemplate): string => {
  const instructions = template.sections?.instructions;
  if (!instructions?.trim()) {
    return messages.management.noTemplate;
  }
  // Show first 100 characters of instructions
  return instructions.length > 100 ? `${instructions.substring(0, 100)}...` : instructions;
};

/**
 * Filters templates based on search text
 * @param templates Array of templates to filter
 * @param searchText Search query string
 * @returns Filtered array of templates
 */
export const filterTemplates = (templates: CustomTemplate[], searchText: string): CustomTemplate[] => {
  if (!searchText.trim()) return templates;

  const searchLower = searchText.trim().toLowerCase();
  return templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchLower) ||
      template.sections?.instructions?.toLowerCase().includes(searchLower)
  );
};

/**
 * Creates a temporary template object for new template creation
 * @returns Temporary CustomTemplate object
 */
export const createTempTemplate = (): CustomTemplate => {
  const defaults = {
    id: "",
    name: "",
    icon: "",
    sections: {
      instructions: "",
      output: undefined,
    },
    isBuiltIn: false,
  } as CustomTemplate;

  return createTempEntity(defaults);
};

/**
 * Handles template deletion with confirmation
 * @param template Template to delete
 * @param deleteTemplate Function to delete the template
 */
export const handleTemplateDeletion = async (
  template: CustomTemplate,
  deleteTemplate: (id: string) => Promise<void>
): Promise<void> => {
  const confirmed = await confirmDeletion(ENTITY_TYPES.TEMPLATE, template.name);
  if (!confirmed) return;

  await executeDeleteOperation(ENTITY_TYPES.TEMPLATE, template.name, () => deleteTemplate(template.id));
};

/**
 * Calculates the display count message for templates
 * @param filteredCount Number of filtered templates
 * @returns Formatted count message
 */
export const getTemplatesCountMessage = (filteredCount: number): string => {
  return getEntityCountMessage(filteredCount, "Templates");
};
